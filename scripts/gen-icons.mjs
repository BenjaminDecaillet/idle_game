// Renders public/favicon.svg to the PNG sizes required by the PWA manifest.
// Usage: node scripts/gen-icons.mjs
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'public/favicon.svg'), 'utf8');

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
});
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<body style="margin:0"><div style="width:${size}px;height:${size}px">${svg.replace(
      '<svg ',
      `<svg width="${size}" height="${size}" `,
    )}</div></body>`,
  );
  await page.screenshot({
    path: join(root, `public/icon-${size}.png`),
    omitBackground: true,
  });
  await page.close();
  console.log(`public/icon-${size}.png written`);
}
await browser.close();
