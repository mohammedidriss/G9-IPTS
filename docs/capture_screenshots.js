const puppeteer = require("puppeteer");
const path = require("path");

const SS = path.join(__dirname, "screenshots");
const BASE = "http://localhost:5001";

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Navigate and login
  await page.goto(BASE, { waitUntil: "networkidle2" });
  await page.type("#loginUser", "", { delay: 0 });
  await page.evaluate(() => { document.getElementById("loginUser").value = "mohamad"; });
  await page.evaluate(() => { document.getElementById("loginPass").value = "Mohamad@2026!"; });
  await page.click('button[onclick="doLogin()"]');
  await page.waitForSelector("#mainApp:not(.hidden)", { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));

  // Helper
  async function snap(name) {
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SS, name), fullPage: false });
    console.log(`  Captured: ${name}`);
  }

  // 1. Dashboard with sub-accounts and notifications
  await page.evaluate(() => { switchTab("dashboard"); window.scrollTo(0, 0); });
  await new Promise(r => setTimeout(r, 1500));
  await snap("Dashboard_MultiAccount.png");

  // 2. Dashboard scrolled to ledger
  await page.evaluate(() => {
    const el = document.querySelector("#ledgerBody")?.closest(".glass");
    if (el) el.scrollIntoView({ behavior: "instant" });
  });
  await new Promise(r => setTimeout(r, 500));
  await snap("Dashboard_Ledger.png");

  // 3. Notification panel
  await page.evaluate(() => { window.scrollTo(0, 0); });
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => { toggleNotifications(); });
  await new Promise(r => setTimeout(r, 500));
  await snap("Notifications_Panel.png");
  await page.evaluate(() => { toggleNotifications(); });

  // 4. Payments - Settlement tab
  await page.evaluate(() => { switchTab("payments"); switchPaySub("settlement"); });
  await new Promise(r => setTimeout(r, 1000));
  await snap("Payment_Settlement.png");

  // 5. P2P Transfer
  await page.evaluate(() => { switchPaySub("p2p"); });
  await new Promise(r => setTimeout(r, 800));
  await snap("Payment_P2P.png");

  // 6. ACH/Wire/SEPA
  await page.evaluate(() => { switchPaySub("external"); });
  await new Promise(r => setTimeout(r, 800));
  await snap("Payment_ACH_Wire_SEPA.png");

  // 7. Scheduled Payments
  await page.evaluate(() => { switchPaySub("scheduled"); });
  await new Promise(r => setTimeout(r, 800));
  await snap("Payment_Scheduled.png");

  // 8. QR Pay
  await page.evaluate(() => { switchPaySub("qr"); });
  await new Promise(r => setTimeout(r, 800));
  await snap("Payment_QR_Pay.png");

  // 9. Beneficiaries tab
  await page.evaluate(() => { switchTab("beneficiaries"); });
  await new Promise(r => setTimeout(r, 1000));
  await snap("Beneficiaries_Tab.png");

  // 10. Spending 360
  await page.evaluate(() => { switchTab("reporting"); window.scrollTo(0, 0); });
  await new Promise(r => setTimeout(r, 1500));
  await snap("Spending_360_Overview.png");

  // 11. Spending 360 - charts
  await page.evaluate(() => { window.scrollTo(0, 800); });
  await new Promise(r => setTimeout(r, 500));
  await snap("Spending_360_Charts.png");

  // 12. Spending 360 - bottom (beneficiaries + transactions)
  await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); });
  await new Promise(r => setTimeout(r, 500));
  await snap("Spending_360_Transactions.png");

  // 13. Cards tab
  await page.evaluate(() => { switchTab("cards"); window.scrollTo(0, 0); });
  await new Promise(r => setTimeout(r, 1000));
  await snap("Cards_Tab.png");

  // 14. Security tab - KYC
  await page.evaluate(() => { switchTab("security"); window.scrollTo(0, 0); });
  await new Promise(r => setTimeout(r, 1000));
  await snap("Security_KYC.png");

  // 15. Security - fraud alerts (scroll down)
  await page.evaluate(() => { window.scrollTo(0, 600); });
  await new Promise(r => setTimeout(r, 500));
  await snap("Security_Fraud_Alerts.png");

  // 16. Documents tab
  await page.evaluate(() => { switchTab("documents"); window.scrollTo(0, 0); });
  await new Promise(r => setTimeout(r, 1000));
  await snap("Documents_Tab.png");

  // 17. Support Chat
  await page.evaluate(() => { switchTab("dashboard"); window.scrollTo(0, 0); });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => { toggleChat(); });
  await new Promise(r => setTimeout(r, 800));
  await snap("Support_Chat.png");
  await page.evaluate(() => { toggleChat(); });

  console.log("\nAll screenshots captured successfully!");
  await browser.close();
})();
