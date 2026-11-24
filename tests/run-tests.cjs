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
    const files = ['index.html', 'js/app.js', 'js/i18n.js', 'js/settings.js', 'js/gemini.js'];
    for (const file of files) {
      const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
      assert.equal(/AIza[0-9A-Za-z_-]{35}/.test(text), false, `${file} seems to contain a real key`);
    }
  });

  await browser.close();
  server.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  process.exit(failed.length ? 1 : 0);
})();
