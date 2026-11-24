// run-tests.cjs — automatic tests for Espelho IA.
// Run with:  node tests/run-tests.cjs
//
// What it does:
//   1. starts a tiny local web server for the project folder,
//   2. opens the app in a headless browser sized like an iPhone,
//   3. clicks through the app like a person would and checks the results.
// The Gemini API is never really called: we "mock" (fake) Google's answers,
// so tests are free, fast and do not need a real key.

const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium, devices } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}/`;
const SCREENSHOTS = process.env.SCREENSHOT_DIR || '';

// ---------- 1. A tiny static file server ----------
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, BASE).pathname);
    const file = path.normalize(path.join(ROOT, urlPath.endsWith('/') ? urlPath + 'index.html' : urlPath));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

// ---------- 2. Test helpers ----------
const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error });
    console.log(`  ✗ ${name}\n      ${String(error.message).split('\n').join('\n      ')}`);
  }
}

// Fake answers from Google for the "Test key" button.
const MODELS_OK = {
  models: [
    { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent', 'countTokens'] },
    { name: 'models/text-embedding-005', supportedGenerationMethods: ['embedContent'] },
  ],
};
const KEY_INVALID = {
  error: {
    code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT',
    details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID' }],
  },
};
const FAKE_KEY = 'AIzaTEST_0123456789abcdefghijklmnopqrstu';

async function newPage(browser, { colorScheme = 'light' } = {}) {
  const context = await browser.newContext({ ...devices['iPhone 13'], colorScheme, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (error) => page.errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') page.errors.push(message.text()); });
  return { context, page };
}

async function shot(page, name) {
  if (!SCREENSHOTS) return;
  fs.mkdirSync(SCREENSHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOTS, `${name}.png`) });
}

// ---------- 3. The tests ----------
(async () => {
  const server = await startServer();
  const browser = await chromium.launch();
  console.log('Espelho IA — tests\n');

  // Shared page for the main flow.
  const { context, page } = await newPage(browser);
  await page.goto(BASE);

  await test('first visit shows the welcome dialog in Persian (RTL)', async () => {
    await page.locator('#welcome').waitFor({ state: 'visible' });
    assert.equal(await page.getAttribute('html', 'dir'), 'rtl');
    assert.equal(await page.getAttribute('html', 'lang'), 'fa');
    assert.match(await page.textContent('#welcome-title'), /خوش آمدی/);
    await shot(page, '01-welcome-fa');
  });

  await test('"Start" closes the welcome and opens Settings when there is no key', async () => {
    await page.click('#welcome-start');
    await page.locator('#screen-settings').waitFor({ state: 'visible' });
    assert.equal(await page.isVisible('#welcome'), false);
    await shot(page, '02-settings-fa');
  });

  await test('welcome is not shown again after reload', async () => {
    await page.reload();
    await page.waitForSelector('body.is-ready');
    assert.equal(await page.isVisible('#welcome'), false);
  });

  await test('tab bar switches screens and marks the active tab', async () => {
    for (const name of ['mirror', 'review', 'progress', 'settings']) {
      await page.click(`.tabbar__item[data-tab="${name}"]`);
      await page.locator(`#screen-${name}`).waitFor({ state: 'visible' });
      assert.equal(await page.getAttribute(`.tabbar__item[data-tab="${name}"]`, 'aria-current'), 'page');
      const visible = await page.locator('.screen:visible').count();
      assert.equal(visible, 1, 'exactly one screen should be visible');
    }
  });

  await test('Mirror screen asks for a key when none is saved', async () => {
    await page.click('.tabbar__item[data-tab="mirror"]');
    await page.locator('#screen-mirror').waitFor({ state: 'visible' });
    assert.equal(await page.isVisible('#mirror-need-key'), true);
    await shot(page, '03-mirror-no-key');
  });

  await test('API key field is hidden by default and Show/Hide works', async () => {
    await page.click('.tabbar__item[data-tab="settings"]');
    assert.equal(await page.getAttribute('#api-key', 'type'), 'password');
    await page.click('#toggle-key');
    assert.equal(await page.getAttribute('#api-key', 'type'), 'text');
    assert.equal(await page.getAttribute('#toggle-key', 'aria-pressed'), 'true');
    await page.click('#toggle-key');
    assert.equal(await page.getAttribute('#api-key', 'type'), 'password');
  });

  await test('saving an empty key shows an error', async () => {
    await page.fill('#api-key', '   ');
    await page.click('#save-key');
    assert.equal(await page.getAttribute('#key-status', 'data-kind'), 'error');
  });

  await test('saving a key stores it on the device only (localStorage) and trims spaces', async () => {
    await page.fill('#api-key', `  ${FAKE_KEY}  `);
    await page.click('#save-key');
    assert.equal(await page.getAttribute('#key-status', 'data-kind'), 'ok');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('espelho.settings.v1')));
    assert.equal(stored.apiKey, FAKE_KEY);
    await page.reload();
    await page.waitForSelector('body.is-ready');
    await page.goto(BASE + '#settings');
    assert.equal(await page.inputValue('#api-key'), FAKE_KEY);
  });

  await test('a key in Google\'s newer format (not starting with AIza) is accepted', async () => {
    const newFormatKey = 'AQ.Ab8RN6Lr2zXkTestOnly-not_a_real_key_123456';
    await page.fill('#api-key', newFormatKey);
    await page.click('#save-key');
    assert.equal(await page.getAttribute('#key-status', 'data-kind'), 'ok');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('espelho.settings.v1')));
    assert.equal(stored.apiKey, newFormatKey);
  });

  await test('a key with a space inside (copy/paste mistake) is rejected and not saved', async () => {
    await page.fill('#api-key', 'AQ.Ab8RN6Lr2zXk TestOnly-not_a_real_key');
    await page.click('#save-key');
    assert.equal(await page.getAttribute('#key-status', 'data-kind'), 'error');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('espelho.settings.v1')));
    assert.equal(stored.apiKey, 'AQ.Ab8RN6Lr2zXkTestOnly-not_a_real_key_123456');
    // put the normal test key back for the next tests
    await page.fill('#api-key', FAKE_KEY);
    await page.click('#save-key');
  });

  await test('Mirror screen no longer asks for a key once one is saved', async () => {
    await page.goto(BASE + '#mirror');
    assert.equal(await page.isVisible('#mirror-need-key'), false);
  });

  await test('"Test key" with a working key picks the best model (flash-lite)', async () => {
    let sentKey = null;
    await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
      sentKey = route.request().headers()['x-goog-api-key'];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MODELS_OK),
        headers: { 'access-control-allow-origin': '*' } });
    });
    await page.goto(BASE + '#settings');
    await page.click('#test-key');
    await page.waitForFunction(() => document.querySelector('#key-status').dataset.kind === 'ok');
    assert.equal(sentKey, FAKE_KEY, 'key must be sent in the x-goog-api-key header');
    assert.match(await page.textContent('#key-status'), /gemini-3\.5-flash-lite/);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('espelho.settings.v1')));
    assert.equal(stored.model, 'gemini-3.5-flash-lite');
    await shot(page, '04-key-ok');
    await page.unroute('https://generativelanguage.googleapis.com/**');
  });

  await test('"Test key" with an invalid key shows a clear message', async () => {
    await page.route('https://generativelanguage.googleapis.com/**', (route) => route.fulfill({
      status: 400, contentType: 'application/json', body: JSON.stringify(KEY_INVALID),
      headers: { 'access-control-allow-origin': '*' } }));
    await page.click('#test-key');
    await page.waitForFunction(() => document.querySelector('#key-status').dataset.kind === 'error');
    assert.match(await page.textContent('#key-status'), /معتبر نیست/);
    await page.unroute('https://generativelanguage.googleapis.com/**');
  });

  await test('"Test key" reports quota (429) and no-internet errors', async () => {
    await page.route('https://generativelanguage.googleapis.com/**', (route) => route.fulfill({
      status: 429, contentType: 'application/json', body: JSON.stringify({ error: { code: 429, message: 'Resource exhausted' } }),
      headers: { 'access-control-allow-origin': '*' } }));
    await page.click('#test-key');
    await page.waitForFunction(() => /سهمیه/.test(document.querySelector('#key-status').textContent));
    await page.unroute('https://generativelanguage.googleapis.com/**');

    await page.route('https://generativelanguage.googleapis.com/**', (route) => route.abort('internetdisconnected'));
    await page.click('#test-key');
    await page.waitForFunction(() => /اینترنت/.test(document.querySelector('#key-status').textContent));
    await page.unroute('https://generativelanguage.googleapis.com/**');
  });

  await test('level choice is saved', async () => {
    await page.check('input[name="level"][value="A2"]');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('espelho.settings.v1')));
    assert.equal(stored.level, 'A2');
  });

  await test('switching to Portuguese changes text and direction to LTR', async () => {
    await page.check('input[name="uiLang"][value="pt"]');
    assert.equal(await page.getAttribute('html', 'dir'), 'ltr');
    assert.equal(await page.getAttribute('html', 'lang'), 'pt-BR');
    assert.equal(await page.textContent('#settings-title'), 'Ajustes');
    assert.equal(await page.textContent('.tabbar__item[data-tab="review"] span'), 'Revisão');
    await shot(page, '05-settings-pt');
    await page.check('input[name="uiLang"][value="fa"]');
    assert.equal(await page.getAttribute('html', 'dir'), 'rtl');
  });

  await test('theme choice sets dark mode and survives reload', async () => {
    await page.check('input[name="theme"][value="dark"]');
    assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
    await page.reload();
    await page.waitForSelector('body.is-ready');
    assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.equal(bg, 'rgb(16, 22, 19)');
    await shot(page, '06-settings-dark');
    await page.check('input[name="theme"][value="auto"]');
    assert.equal(await page.getAttribute('html', 'data-theme'), null);
  });

  await test('deleting the key removes it from the device', async () => {
    await page.click('#delete-key');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('espelho.settings.v1')));
    assert.equal(stored.apiKey, '');
    assert.equal(await page.inputValue('#api-key'), '');
  });

  await test('no page fits wider than the phone (no sideways scrolling)', async () => {
    for (const name of ['mirror', 'review', 'progress', 'settings']) {
      await page.goto(BASE + '#' + name);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 0, `#${name} overflows by ${overflow}px`);
    }
  });

  await test('no JavaScript or security (CSP) errors happened', async () => {
    // The fake "no internet" test makes the browser log one network error on purpose; ignore that one.
    const real = page.errors.filter((text) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(text));
    assert.deepEqual(real, []);
  });
  await context.close();

  // A fresh visitor whose iPhone is in dark mode.
  await test('"auto" theme follows the iPhone dark mode', async () => {
    const { context: darkContext, page: darkPage } = await newPage(browser, { colorScheme: 'dark' });
    await darkPage.goto(BASE + '#mirror');
    await darkPage.click('#welcome-start');
    await darkPage.goto(BASE + '#mirror');
    const bg = await darkPage.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.equal(bg, 'rgb(16, 22, 19)');
    await shot(darkPage, '07-mirror-dark-auto');
    await darkContext.close();
  });

  await test('the app still opens when storage is blocked (like Private Browsing)', async () => {
    const { context: privateContext, page: privatePage } = await newPage(browser);
    await privatePage.addInitScript(() => {
      const blocked = () => { throw new DOMException('blocked', 'SecurityError'); };
      Object.defineProperty(window, 'localStorage', { get: blocked });
    });
    await privatePage.goto(BASE);
    await privatePage.waitForSelector('body.is-ready');
    assert.deepEqual(privatePage.errors, []);
    await privateContext.close();
  });

  await test('manifest is valid and all icons exist', async () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
    assert.equal(manifest.display, 'standalone');
    for (const icon of manifest.icons) assert.ok(fs.existsSync(path.join(ROOT, icon.src)), icon.src);
    assert.ok(fs.existsSync(path.join(ROOT, 'icons/icon-180.png')));
  });

  await test('no API key or secret is written in the code', async () => {
    const files = ['index.html', ...fs.readdirSync(path.join(ROOT, 'js')).map((name) => 'js/' + name)];
    for (const file of files) {
      const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
      assert.equal(/AIza[0-9A-Za-z_-]{35}/.test(text), false, `${file} seems to contain a real key`);
    }
  });

  // ======================= Stage 3: camera + AI description =======================
  console.log('\nStage 3 — camera and description');
  const PHOTO = path.join(ROOT, 'tests/fixtures/photo-large.jpg');
  const GOOD_DESCRIPTION = {
    recognized: true,
    object_pt: 'a caneca',
    object_fa: 'ماگ',
    description_pt: 'Esta é uma caneca azul. Ela está em cima da mesa. Eu tomo café na caneca.',
    description_fa: 'این یک ماگ آبی است. روی میز است. من در ماگ قهوه می‌نوشم.',
    vocabulary: [
      { pt: 'a caneca', fa: 'ماگ' }, { pt: 'a mesa', fa: 'میز' },
      { pt: 'o café', fa: 'قهوه' }, { pt: 'azul', fa: 'آبی' },
    ],
    note_fa: '«caneca» مؤنث است، پس می‌گوییم «a caneca» و «uma caneca».',
  };
  // Wraps a JSON object the way Gemini really answers.
  const geminiAnswer = (object, extra = {}) => ({
    candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(object) }] }, finishReason: 'STOP', ...extra }],
  });
  const json = (route, status, body) => route.fulfill({
    status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'access-control-allow-origin': '*' } });

  // A page that already has a key and a model saved.
  async function mirrorPage(settingsOverride = {}) {
    const { context: ctx, page: p } = await newPage(browser);
    await p.addInitScript((saved) => {
      localStorage.setItem('espelho.settings.v1', JSON.stringify(saved));
    }, { apiKey: FAKE_KEY, model: 'gemini-3.5-flash-lite', level: 'A1', uiLang: 'fa', theme: 'auto', onboarded: true, ...settingsOverride });
    await p.goto(BASE + '#mirror');
    await p.waitForSelector('body.is-ready');
    return { ctx, p };
  }

  await test('a photo is shrunk, sent to Gemini correctly, and the result is shown', async () => {
    const { ctx, p } = await mirrorPage({ level: 'A2' });
    let request = null;
    await p.route('https://generativelanguage.googleapis.com/**', (route) => {
      request = route.request();
      return json(route, 200, geminiAnswer(GOOD_DESCRIPTION));
    });
    await p.setInputFiles('#camera-input', PHOTO);
    await p.locator('#mirror-result').waitFor({ state: 'visible' });

    // What was sent
    assert.equal(request.method(), 'POST');
    assert.match(request.url(), /models\/gemini-3\.5-flash-lite:generateContent$/);
    assert.equal(request.headers()['x-goog-api-key'], FAKE_KEY);
    const body = JSON.parse(request.postData());
    const image = body.contents[0].parts.find((part) => part.inlineData).inlineData;
    assert.equal(image.mimeType, 'image/jpeg');
    assert.ok(image.data.startsWith('/9j/'), 'image must be JPEG base64');
    assert.match(body.systemInstruction.parts[0].text, /A2/);
    assert.equal(body.generationConfig.responseMimeType, 'application/json');
    const size = await p.evaluate((data) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve([img.naturalWidth, img.naturalHeight]);
      img.src = 'data:image/jpeg;base64,' + data;
    }), image.data);
    assert.deepEqual(size, [768, 1024], 'a 3024x4032 photo must be shrunk to 768x1024');
    assert.ok(image.data.length < 400000, `image too big: ${image.data.length} chars`);

    // What is shown
    assert.equal(await p.textContent('#result-object'), 'a caneca');
    assert.equal(await p.textContent('#result-object-fa'), 'ماگ');
    assert.match(await p.textContent('#result-description'), /caneca azul/);
    assert.equal(await p.locator('.vocab__item').count(), 4);
    assert.match(await p.textContent('#result-level'), /A2/);
    assert.equal(await p.isVisible('#result-description-fa'), false, 'translation is folded by default');
    await p.click('.result__translation summary');
    assert.equal(await p.isVisible('#result-description-fa'), true);
    await shot(p, '10-result-fa');
    assert.deepEqual(p.errors, []);

    // "New photo" goes back to the start
    await p.click('#mirror-new');
    assert.equal(await p.isVisible('#mirror-start'), true);
    assert.equal(await p.getAttribute('#result-photo', 'src'), null, 'photo must be forgotten');
    await ctx.close();
  });

  await test('AI text is shown as plain text (no code can run from an answer)', async () => {
    const { ctx, p } = await mirrorPage();
    await p.route('https://generativelanguage.googleapis.com/**', (route) => json(route, 200, geminiAnswer({
      ...GOOD_DESCRIPTION, description_pt: '<img src=x onerror="window.__hacked=1"> texto',
    })));
    await p.setInputFiles('#camera-input', PHOTO);
    await p.locator('#mirror-result').waitFor({ state: 'visible' });
    assert.match(await p.textContent('#result-description'), /<img src=x/);
    assert.equal(await p.evaluate(() => window.__hacked), undefined);
    assert.equal(await p.locator('#result-description img').count(), 0);
    await ctx.close();
  });

  await test('unclear photo -> friendly "not recognized" message with retry', async () => {
    const { ctx, p } = await mirrorPage();
    await p.route('https://generativelanguage.googleapis.com/**', (route) => json(route, 200, geminiAnswer({
      recognized: false, object_pt: '', object_fa: '', description_pt: '', description_fa: '', vocabulary: [], note_fa: '' })));
    await p.setInputFiles('#library-input', PHOTO);
    await p.locator('#mirror-error').waitFor({ state: 'visible' });
    assert.match(await p.textContent('#mirror-error-text'), /تشخیص/);
    assert.equal(await p.isVisible('#mirror-retry'), true);
    await ctx.close();
  });

  await test('quota error (429), then "Try again" works with the same photo', async () => {
    const { ctx, p } = await mirrorPage();
    let calls = 0;
    await p.route('https://generativelanguage.googleapis.com/**', (route) => {
      calls += 1;
      return calls === 1
        ? json(route, 429, { error: { code: 429, message: 'Resource has been exhausted', status: 'RESOURCE_EXHAUSTED' } })
        : json(route, 200, geminiAnswer(GOOD_DESCRIPTION));
    });
    await p.setInputFiles('#camera-input', PHOTO);
    await p.locator('#mirror-error').waitFor({ state: 'visible' });
    assert.match(await p.textContent('#mirror-error-text'), /سهمیه/);
    await shot(p, '11-error-quota');
    await p.click('#mirror-retry');
    await p.locator('#mirror-result').waitFor({ state: 'visible' });
    assert.equal(calls, 2);
    await ctx.close();
  });

  await test('retired model (404) -> app picks a new model by itself and continues', async () => {
    const { ctx, p } = await mirrorPage({ model: 'gemini-old-model' });
    const posted = [];
    await p.route('https://generativelanguage.googleapis.com/**', (route) => {
      const url = route.request().url();
      if (route.request().method() === 'GET') return json(route, 200, MODELS_OK);
      posted.push(url);
      if (url.includes('gemini-old-model')) return json(route, 404, { error: { code: 404, message: 'models/gemini-old-model is not found', status: 'NOT_FOUND' } });
      return json(route, 200, geminiAnswer(GOOD_DESCRIPTION));
    });
    await p.setInputFiles('#camera-input', PHOTO);
    await p.locator('#mirror-result').waitFor({ state: 'visible' });
    assert.equal(posted.length, 2);
    assert.match(posted[1], /gemini-3\.5-flash-lite/);
    const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('espelho.settings.v1')));
    assert.equal(stored.model, 'gemini-3.5-flash-lite');
    await ctx.close();
  });

  await test('no model saved yet -> app chooses one first, then describes', async () => {
    const { ctx, p } = await mirrorPage({ model: '' });
    await p.route('https://generativelanguage.googleapis.com/**', (route) => (
      route.request().method() === 'GET' ? json(route, 200, MODELS_OK) : json(route, 200, geminiAnswer(GOOD_DESCRIPTION))));
    await p.setInputFiles('#camera-input', PHOTO);
    await p.locator('#mirror-result').waitFor({ state: 'visible' });
    await ctx.close();
  });

  await test('safety block, broken answer and invalid key each show the right message', async () => {
    const cases = [
      { reply: (route) => json(route, 200, { candidates: [{ finishReason: 'SAFETY' }] }), text: /فیلتر ایمنی/, settingsLink: false },
      { reply: (route) => json(route, 200, { candidates: [{ content: { parts: [{ text: 'not json {' }] }, finishReason: 'STOP' }] }), text: /ناقص/, settingsLink: false },
      { reply: (route) => json(route, 400, KEY_INVALID), text: /تنظیمات/, settingsLink: true },
      { reply: (route) => route.abort('internetdisconnected'), text: /اینترنت/, settingsLink: false },
    ];
    for (const item of cases) {
      const { ctx, p } = await mirrorPage();
      await p.route('https://generativelanguage.googleapis.com/**', item.reply);
      await p.setInputFiles('#camera-input', PHOTO);
      await p.locator('#mirror-error').waitFor({ state: 'visible' });
      assert.match(await p.textContent('#mirror-error-text'), item.text);
      assert.equal(await p.isVisible('#mirror-error-settings'), item.settingsLink);
      await ctx.close();
    }
  });

  await test('a file that is not a real image shows a clear message', async () => {
    const { ctx, p } = await mirrorPage();
    let called = false;
    await p.route('https://generativelanguage.googleapis.com/**', (route) => { called = true; return route.abort(); });
    await p.setInputFiles('#camera-input', { name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('this is not a picture') });
    await p.locator('#mirror-error').waitFor({ state: 'visible' });
    assert.match(await p.textContent('#mirror-error-text'), /قابل خواندن نیست/);
    assert.equal(await p.isVisible('#mirror-retry'), false);
    assert.equal(called, false, 'nothing must be sent to Google');
    await ctx.close();
  });

  await test('without a key, the camera buttons are disabled', async () => {
    const { ctx, p } = await mirrorPage({ apiKey: '', model: '' });
    assert.equal(await p.isDisabled('#camera-input'), true);
    assert.equal(await p.isDisabled('#library-input'), true);
    assert.equal(await p.isVisible('#mirror-need-key'), true);
    await ctx.close();
  });

  await test('result looks right in dark mode and in Portuguese, without sideways scroll', async () => {
    const { ctx, p } = await mirrorPage({ theme: 'dark', uiLang: 'pt' });
    await p.route('https://generativelanguage.googleapis.com/**', (route) => json(route, 200, geminiAnswer(GOOD_DESCRIPTION)));
    await p.setInputFiles('#camera-input', PHOTO);
    await p.locator('#mirror-result').waitFor({ state: 'visible' });
    assert.equal(await p.textContent('.result__subtitle'), 'Palavras-chave');
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `overflows by ${overflow}px`);
    await shot(p, '12-result-pt-dark');
    assert.deepEqual(p.errors, []);
    await ctx.close();
  });

  await browser.close();
  server.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  process.exit(failed.length ? 1 : 0);
})();
