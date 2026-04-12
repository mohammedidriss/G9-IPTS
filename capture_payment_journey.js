const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  await page.goto('http://localhost:5001', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#loginUser', { timeout: 10000 });

  // Clear and fill login - credentials are pre-filled but let's ensure correct ones
  await page.evaluate(() => {
    document.getElementById('loginUser').value = 'mohamad';
    document.getElementById('loginPass').value = 'Mohamad@2026!';
  });
  await page.evaluate(() => doLogin());
  await page.waitForSelector('#mainApp', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));

  // Go to Payments tab
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-tab]')].find(el => el.dataset.tab === 'payments');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Make sure Settlement sub-tab is active
  await page.evaluate(() => {
    if (typeof switchPaySub === 'function') switchPaySub('settlement');
  });
  await new Promise(r => setTimeout(r, 500));

  // === Screenshot 1: In-Progress (step 4 active) ===
  await page.evaluate(() => { if (typeof showPaymentFlow === 'function') showPaymentFlow('start'); });
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => {
    const panel = document.getElementById('paymentFlowPanel');
    if (panel) panel.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: '/tmp/Payment_Journey_InProgress.png', captureBeyondViewport: false });
  console.log('✓ Payment_Journey_InProgress.png');

  // === Screenshot 2: HITL Pending (amber, waiting for approval) ===
  await page.evaluate(() => {
    if (typeof showPaymentFlow === 'function') showPaymentFlow('hitl_pending', { risk_score: 78.4 });
  });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    const panel = document.getElementById('paymentFlowPanel');
    if (panel) panel.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: '/tmp/Payment_Journey_Pending.png', captureBeyondViewport: false });
  console.log('✓ Payment_Journey_Pending.png');

  // === Screenshot 3: Completed (all green) ===
  await page.evaluate(() => {
    if (typeof showPaymentFlow === 'function') showPaymentFlow('start');
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => {
    if (typeof showPaymentFlow === 'function') showPaymentFlow('complete', {
      risk_score: 12.3,
      tx_hash: '0xabc123def456789012345abcdef012345678901',
      uetr: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    });
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => {
    const panel = document.getElementById('paymentFlowPanel');
    if (panel) panel.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: '/tmp/Payment_Journey_Completed.png', captureBeyondViewport: false });
  console.log('✓ Payment_Journey_Completed.png');

  await browser.close();
  console.log('Done.');
})();
