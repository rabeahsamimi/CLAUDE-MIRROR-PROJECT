// make-icons.cjs — turns icons/icon.svg into the PNG files the iPhone and the PWA manifest need.
// Run with:  node tools/make-icons.cjs
// It opens the SVG in a headless browser (Playwright) and takes exact-size screenshots.

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'icons', 'icon.svg'), 'utf8');

// iPhone and "maskable" icons must be full squares: the system cuts the round corners itself.
const squareSvg = svg.replace(/<rect width="512" height="512" rx="112"/, '<rect width="512" height="512"');

const outputs = [
  { file: 'icon-180.png', size: 180, source: squareSvg }, // apple-touch-icon (Home Screen)
  { file: 'icon-192.png', size: 192, source: svg },
  { file: 'icon-512.png', size: 512, source: svg },
  { file: 'icon-maskable-512.png', size: 512, source: squareSvg },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const { file, size, source } of outputs) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${source}`
    );
    await page.locator('svg').screenshot({ path: path.join(root, 'icons', file), omitBackground: true });
    console.log('wrote icons/' + file);
  }
  await browser.close();
})();
