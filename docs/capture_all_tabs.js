/**
 * IPTS — Full System Screenshot Capture
 * High Quality 2x Retina — All tabs, all sections
 * Output: /docs/screenshots/
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs   = require('fs');

const BASE_URL = 'http://localhost:5001';
const OUT_DIR  = path.join(__dirname, 'screenshots');
const VIEWPORT = { width: 1600, height: 900, deviceScaleFactor: 2 };

const USERS = {
  admin:      { username: 'mohamad', password: 'Mohamad@2026!' },
  operator:   { username: 'rohit',   password: 'Rohit@2026!'   },
  compliance: { username: 'walid',   password: 'Walid@2026!'   },
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Helpers ──────────────────────────────────────────────────────────────────

async function login(page, user = USERS.admin) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(300);
  const res = await page.evaluate(async (url, u, p) => {
    const r = await fetch(`${url}/api/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    return r.json();
  }, BASE_URL, user.username, user.password);
  if (!res.token) throw new Error('Login failed: ' + JSON.stringify(res));
  await page.evaluate((token, u) => {
    localStorage.setItem('ipts_token', token);
    localStorage.setItem('ipts_user', JSON.stringify({ username: u.username, full_name: u.username }));
  }, res.token, user);
}

async function loadApp(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);
}

async function switchTab(page, tabName) {
  await page.evaluate(tab => {
    if (typeof switchTab === 'function') switchTab(tab);
  }, tabName);
  await sleep(1800);
}

async function scrollTo(page, y) {
  await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
  await sleep(600);
}

async function shot(page, filename, scrollY = 0, wait = 900) {
  if (scrollY !== null) await scrollTo(page, scrollY);
  await sleep(wait);
  const out = path.join(OUT_DIR, filename);
  await page.screenshot({ path: out, type: 'png' });
  console.log(`  ✅  ${filename}`);
}

async function fullTabShot(page, filename) {
  // Expand page to capture everything
  const height = await page.evaluate(() => document.getElementById('tab-' + window._currentTab)?.scrollHeight || document.body.scrollHeight);
  await page.setViewport({ ...VIEWPORT, height: Math.min(height + 200, 4000) });
  await sleep(400);
  await scrollTo(page, 0);
  await page.screenshot({ path: path.join(OUT_DIR, filename), type: 'png', fullPage: false });
  await page.setViewport(VIEWPORT);
  console.log(`  ✅  ${filename}`);
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,900']
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // Login and load app
  await login(page);
  await loadApp(page);

  // ── 1. DASHBOARD ───────────────────────────────────────────────────────────
  console.log('\n📸  Dashboard');
  await switchTab(page, 'dashboard');
  await shot(page, 'dashboard_01_kpis_overview.png',   0,    1200);
  await shot(page, 'dashboard_02_fx_ledger.png',       430,  900);
  await shot(page, 'dashboard_03_settlement_aml.png',  760,  900);

  // ── 2. BENEFICIARY ─────────────────────────────────────────────────────────
  console.log('\n📸  Beneficiary');
  await switchTab(page, 'beneficiaries');
  await shot(page, 'beneficiary_01_list.png', 0, 1200);

  // ── 3. PAYMENTS ────────────────────────────────────────────────────────────
  console.log('\n📸  Payments');
  await switchTab(page, 'payments');
  await sleep(1500);

  // Payment form section
  await shot(page, 'payments_01_form.png',            0,    1000);
  // P2P section
  await shot(page, 'payments_02_p2p.png',             480,  900);
  // Scheduled payments
  await shot(page, 'payments_03_scheduled.png',       860,  900);
  // Transaction history
  await shot(page, 'payments_04_history.png',         1200, 900);
  // Payment journey
  await shot(page, 'payments_05_journey.png',         1550, 900);

  // ── 4. APPROVALS ───────────────────────────────────────────────────────────
  console.log('\n📸  Approvals');
  await switchTab(page, 'approvals');
  await shot(page, 'approvals_01_pending.png', 0, 1200);

  // ── 5. AI/ML ───────────────────────────────────────────────────────────────
  console.log('\n📸  AI/ML');
  await switchTab(page, 'aiml');
  await sleep(2000);
  await shot(page, 'aiml_01_model_metrics.png',     0,    1200);
  await shot(page, 'aiml_02_fraud_heatmap.png',     480,  1000);
  await shot(page, 'aiml_03_shap.png',              900,  1000);
  await shot(page, 'aiml_04_risk_analysis.png',     1300, 1000);

  // ── 6. COMPLIANCE ──────────────────────────────────────────────────────────
  console.log('\n📸  Compliance');
  await switchTab(page, 'compliance');
  await sleep(1500);
  await shot(page, 'compliance_01_overview.png',    0,    1200);
  await shot(page, 'compliance_02_sanctions.png',   480,  900);
  await shot(page, 'compliance_03_nostro.png',      900,  900);
  await shot(page, 'compliance_04_swift_gpi.png',   1200, 900);

  // ── 7. CASE MANAGEMENT ─────────────────────────────────────────────────────
  console.log('\n📸  Case Management');
  await switchTab(page, 'cases');
  await sleep(1500);
  await shot(page, 'cases_01_list.png',             0,    1200);
  // Click first case to open detail if possible
  await page.evaluate(() => {
    const btn = document.querySelector('#tab-cases button, #tab-cases .cursor-pointer');
    if (btn) btn.click();
  });
  await sleep(1000);
  await shot(page, 'cases_02_detail.png',           0,    900);

  // ── 8. SECURITY ────────────────────────────────────────────────────────────
  console.log('\n📸  Security');
  await switchTab(page, 'security');
  await sleep(1500);
  await shot(page, 'security_01_kyc.png',           0,    1200);
  await shot(page, 'security_02_fraud_alerts.png',  480,  900);

  // ── 9. CARDS ───────────────────────────────────────────────────────────────
  console.log('\n📸  Cards');
  await switchTab(page, 'cards');
  await sleep(1200);
  await shot(page, 'cards_01_overview.png',         0,    1200);

  // ── 10. DEFI ───────────────────────────────────────────────────────────────
  console.log('\n📸  DeFi');
  await switchTab(page, 'defi');
  await sleep(1500);
  await shot(page, 'defi_01_overview.png',          0,    1200);
  await shot(page, 'defi_02_swap.png',              480,  900);
  await shot(page, 'defi_03_staking.png',           860,  900);
  await shot(page, 'defi_04_escrow.png',            1200, 900);

  // ── 11. ADMIN ──────────────────────────────────────────────────────────────
  console.log('\n📸  Admin');
  await switchTab(page, 'admin');
  await sleep(1500);
  await shot(page, 'admin_01_hitl_queue.png',       0,    1200);
  await shot(page, 'admin_02_audit_log.png',        480,  900);

  // ── 12. DOCUMENTS ──────────────────────────────────────────────────────────
  console.log('\n📸  Documents');
  await switchTab(page, 'documents');
  await sleep(1200);
  await shot(page, 'documents_01_overview.png',     0,    1200);

  // ── 13. 360 SPENDING ───────────────────────────────────────────────────────
  console.log('\n📸  360 Spending');
  await switchTab(page, 'spending360');
  await sleep(2000);
  await shot(page, 'spending360_01_overview.png',   0,    1200);
  await shot(page, 'spending360_02_charts.png',     480,  900);
  await shot(page, 'spending360_03_transactions.png', 900, 900);

  // ── 14. NETWORK GRAPH ──────────────────────────────────────────────────────
  console.log('\n📸  Network Graph');
  await switchTab(page, 'graph');
  await sleep(2500); // graph needs more time to render
  await shot(page, 'network_01_full_graph.png',     0,    1500);

  await browser.close();

  // Summary
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\n${'='.repeat(55)}`);
  console.log(`  🎉  Done! ${files.length} screenshots saved`);
  console.log(`  📁  ${OUT_DIR}`);
  console.log('='.repeat(55) + '\n');
})();
