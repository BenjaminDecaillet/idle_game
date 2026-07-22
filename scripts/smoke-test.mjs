import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:4173/idle_game/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const money = await page.textContent('#hud-money').catch(() => 'MISSING');
const hero = await page.textContent('#hero-name').catch(() => 'MISSING');
console.log('money:', money, '| hero:', hero);
console.log('errors:', errors.length ? errors : 'none');
await page.screenshot({ path: process.env.SCRATCH + '/smoke-mobile.png' });
await browser.close();
