const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const http = require("http");

const SS = path.join(__dirname, "screenshots");
const BASE = "http://localhost:5001";

function getToken() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username: "mohamad", password: "Mohamad@2026!" });
    const req = http.request(`${BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": data.length }
    }, res => {
      let body = "";
      res.on("data", d => body += d);
      res.on("end", () => resolve(JSON.parse(body).token));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  const token = await getToken();
  console.log("Got JWT token");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
  });

  const page = await browser.newPage();
  // Use 1440x900 — same as first working run
  await page.setViewport({ width: 1440, height: 900 });

  // Block SSE
  await page.setRequestInterception(true);
  page.on("request", req => {
    if (req.url().includes("/api/stream")) req.abort();
    else req.continue();
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // Inject auth + disable SSE
  await page.addScriptTag({
    content: `
      window.connectSSE = function() {};
      TOKEN = "${token}";
      USERNAME = "mohamad";
      FULL_NAME = "Mohamad Idriss";
      ROLE = "admin";
      BALANCE = 427167;
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('mainApp').classList.remove('hidden');
      updateHeaderInfo();
      loadDashboard();
      loadFXRates();
      loadNotifications();
    `
  });
  await new Promise(r => setTimeout(r, 4000));
  console.log("App ready");

  async function snap(name) {
    await new Promise(r => setTimeout(r, 1500));
    try {
      await page.screenshot({ path: path.join(SS, name) });
      const sz = fs.statSync(path.join(SS, name)).size;
      console.log(`  [OK] ${name}  (${(sz / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.log(`  [ERR] ${name}: ${e.message}`);
    }
  }

  async function nav(code) {
    try {
      await page.addScriptTag({ content: `(function(){ ${code} })();` });
    } catch(e) {
      console.log(`  [nav warn] ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  // 1-3: Dashboard
  await nav('switchTab("dashboard"); window.scrollTo(0,0);');
  await snap("Dashboard_MultiAccount.png");

  await nav('document.querySelector("#ledgerBody")?.closest(".glass")?.scrollIntoView({block:"start"});');
  await snap("Dashboard_Ledger.png");

  await nav('window.scrollTo(0,0);');
  await nav('toggleNotifications();');
  await snap("Notifications_Panel.png");
  await nav('toggleNotifications();');

  // 4-8: Payments
  await nav('switchTab("payments");');
  await new Promise(r => setTimeout(r, 1000));
  await nav('switchPaySub("settlement"); window.scrollTo(0,0);');
  await snap("Payment_Settlement.png");

  await nav('switchPaySub("p2p"); window.scrollTo(0,0);');
  await snap("Payment_P2P.png");

  await nav('switchPaySub("external"); window.scrollTo(0,0);');
  await snap("Payment_ACH_Wire_SEPA.png");

  await nav('switchPaySub("scheduled"); window.scrollTo(0,0);');
  await snap("Payment_Scheduled.png");

  await nav('switchPaySub("qr"); window.scrollTo(0,0);');
  await snap("Payment_QR_Pay.png");

  // 9: Beneficiaries
  await nav('switchTab("beneficiaries"); window.scrollTo(0,0);');
  await snap("Beneficiaries_Tab.png");

  // 10-12: Spending 360
  await nav('switchTab("reporting"); window.scrollTo(0,0);');
  await new Promise(r => setTimeout(r, 2000));
  await snap("Spending_360_Overview.png");

  await nav('window.scrollTo(0, 1000);');
  await snap("Spending_360_Charts.png");

  await nav('window.scrollTo(0, 2500);');
  await snap("Spending_360_Transactions.png");

  // 13: Cards
  await nav('switchTab("cards"); window.scrollTo(0,0);');
  await snap("Cards_Tab.png");

  // 14-15: Security
  await nav('switchTab("security"); window.scrollTo(0,0);');
  await snap("Security_KYC.png");

  await nav('window.scrollTo(0, 700);');
  await snap("Security_Fraud_Alerts.png");

  // 16: Documents
  await nav('switchTab("documents"); window.scrollTo(0,0);');
  await snap("Documents_Tab.png");

  // 17: Chat
  await nav('switchTab("dashboard"); window.scrollTo(0,0);');
  await nav('toggleChat();');
  await nav('document.getElementById("chatInput").value="How do I transfer money?"; sendChat();');
  await new Promise(r => setTimeout(r, 1500));
  await snap("Support_Chat.png");

  await browser.close();
  console.log("\n=== ALL 17 SCREENSHOTS CAPTURED ===");
}

run().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
