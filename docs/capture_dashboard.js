/**
 * IPTS Dashboard Screenshot Capture — High Quality (2x Retina)
 */
const puppeteer = require('puppeteer');
const path = require('path');

const BASE_URL  = 'http://localhost:5001';
const OUT_DIR   = path.join(__dirname, 'screenshots');
const USERNAME  = 'mohamad';
const PASSWORD  = 'Mohamad@2026!';
const VIEWPORT  = { width: 1600, height: 900, deviceScaleFactor: 2 };

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function login(page) {
  const res = await page.evaluate(async (url, u, p) => {
    const r = await fetch(`${url}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    return r.json();
  }, BASE_URL, USERNAME, PASSWORD);
  if (!res.token) throw new Error('Login failed: ' + JSON.stringify(res));
  await page.evaluate((token, user) => {
    localStorage.setItem('ipts_token', token);
    localStorage.setItem('ipts_user', JSON.stringify(user));
  }, res.token, { username: USERNAME, full_name: res.full_name });
}

async function shot(page, filename, scrollY, waitMs = 900) {
  await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), scrollY);
  await sleep(waitMs);
  const out = path.join(OUT_DIR, filename);
  await page.screenshot({ path: out, type: 'png' });
  console.log(`✅  ${filename}`);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,900']
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // Navigate and login
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(500);
  await login(page);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000); // let dashboard data load

  console.log('\n📸  Capturing Dashboard...\n');

  // Section 1: KPIs + Proof of Reserve + Accounts + FX Rates (top)
  await shot(page, 'dashboard_01_kpis_overview.png', 0, 1200);

  // Section 2: FX Rates + Real-time Ledger
  await shot(page, 'dashboard_02_fx_ledger.png', 430, 900);

  // Section 3: Settlement Volume + AML Telemetry
  await shot(page, 'dashboard_03_settlement_aml.png', 760, 900);

  await browser.close();
  console.log('\n🎉  Done! Screenshots saved to:', OUT_DIR);
})();
