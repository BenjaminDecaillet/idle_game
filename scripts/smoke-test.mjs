// Smoke test against the BUILT app (run `npm run build` + `vite preview
// --port 4173` first): boots the game in a real Chromium, asserts the HUD,
// every tab button and the Settings build stamp exist, and fails on any
// console/page error. Wired into CI (.github/workflows/ci.yml); run locally
// with CHROMIUM_PATH pointing at a Chrome/Chromium binary if the sandbox
// default (/opt/pw-browsers/chromium) doesn't exist.
import { chromium } from 'playwright-core';

const executablePath = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://localhost:4173/idle_game/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const failures = [];

const money = await page.textContent('#hud-money').catch(() => null);
const hero = await page.textContent('#hero-name').catch(() => null);
if (!money) failures.push('HUD money missing');
if (!hero) failures.push('hero project name missing');

// Every tab must be present (catches "engine green but a tab render throws").
const TABS = ['map', 'office', 'shop', 'vscoin', 'stats'];
for (const tab of TABS) {
  if (!(await page.$(`[data-action="tab:${tab}"]`))) failures.push(`tab button missing: ${tab}`);
}

// The Office drill-down must render: staff room, floor view and the hire
// popup are separate render paths that a green engine can't vouch for.
await page.click('[data-action="tab:office"]').catch(() => failures.push('cannot open office tab'));
await page.waitForTimeout(700);
if (!(await page.$('[data-action="open-hire"]'))) failures.push('office: hire button missing');
await page.click('[data-action="office-staff"]').catch(() => failures.push('cannot open staff room'));
await page.waitForTimeout(700);
if (!(await page.$('[data-action^="buy-upgrade:"]'))) failures.push('staff room: no upgrade cards');
await page
  .click('[data-action="office-building"]')
  .catch(() => failures.push('cannot leave staff room'));
await page.waitForTimeout(700);
await page
  .click('[data-action="office-floor:0"]')
  .catch(() => failures.push('cannot open floor view'));
await page.waitForTimeout(700);
if (!(await page.$('[data-select^="floor-project:"]')))
  failures.push('floor view: project select missing');
await page.click('[data-action="open-hire"]').catch(() => failures.push('cannot open hire popup'));
await page.waitForTimeout(700);
if (!(await page.$('[data-action^="hire:"]'))) failures.push('hire popup: no candidate cards');
await page.click('button.btn[data-action="close-sheet"]').catch(() => failures.push('cannot close hire popup'));
await page.waitForTimeout(300);

// The Stats tab must render (it hosts settings + the build stamp).
await page.click('[data-action="tab:stats"]').catch(() => failures.push('cannot open stats tab'));
await page.waitForTimeout(700);
const stamp = await page
  .$$eval('.hint', (els) => els.map((e) => e.textContent ?? '').find((t) => /Build|Version/.test(t)))
  .catch(() => null);
if (!stamp) failures.push('build stamp missing on the Stats tab');

if (errors.length) failures.push(`console/page errors: ${JSON.stringify(errors)}`);

console.log('money:', money, '| hero:', hero, '| stamp:', stamp?.trim());
if (process.env.SCRATCH) {
  await page.screenshot({ path: process.env.SCRATCH + '/smoke-mobile.png' });
}
await browser.close();

if (failures.length) {
  console.error('SMOKE FAILURES:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('smoke: OK');
