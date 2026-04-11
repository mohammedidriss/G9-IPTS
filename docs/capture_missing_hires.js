/**
 * Capture only the screenshots that are still at 1440x900 (low-res).
 * Run after the main capture_screenshots.js if it timed out mid-way.
 */
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const http = require("http");

const SS   = path.join(__dirname, "screenshots");
const BASE = "http://localhost:5001";

// Only recapture files still at 1440×900 (< 100KB typically, or explicitly listed)
const MISSING = [
  "Dashboard + AMLl.png",
  "Settlement_result-blocked.png",
  "AML_tab.png",
  "SHAP_Explainability.png",
  "SHAP_Feature_Contribution.png",
  "Risk_Score.png",
  "Risk_score2.png",
  "HITL-Approval-1st.png",
  "Audit_log.png",
  "HITL_Approval_2nd.png",
  "four_eyes-message.png",
  "GDPR_Right_to_erase.png",
  "Sanction_list_Add.png",
  "Swift_GPI_tracker.png",
  "Currency_converter.png",
  "Nostro_balance.png",
  "Case_details.png",
  "Case_details_View1.png",
  "Cases_Tab.png",
  "DeFi_Swap.png",
  "DeFi_Staking.png",
  "DeFi_Escrow.png",
  "Dashboard_ProofOfReserve.png",
];

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
    headless: true,
    protocolTimeout: 120000,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
           "--force-device-scale-factor=2"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // Block SSE
  await page.setRequestInterception(true);
  page.on("request", req => {
    if (req.url().includes("/api/stream")) req.abort();
    else req.continue();
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

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
    await new Promise(r => setTimeout(r, 2500));
    try {
      await page.screenshot({
        path: path.join(SS, name),
        type: "png",
        captureBeyondViewport: false,
        timeout: 90000
      });
      const sz = fs.statSync(path.join(SS, name)).size;
      const dim = await page.evaluate(() => `${window.innerWidth*2}×${window.innerHeight*2}`);
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
    await new Promise(r => setTimeout(r, 1200));
  }

  // Dashboard + AML Telemetry
  await nav('switchTab("dashboard"); window.scrollTo(0, 800);');
  await new Promise(r => setTimeout(r, 2000));
  await snap("Dashboard + AMLl.png");

  // Settlement blocked
  await nav('switchTab("payments"); switchPaySub("settlement"); window.scrollTo(0,0);');
  await new Promise(r => setTimeout(r, 1500));
  await nav(`
    document.getElementById('payBeneficiary').value = 'Rohit Jacob Isaac';
    document.getElementById('payAmount').value = '150000';
  `);
  await new Promise(r => setTimeout(r, 500));
  await snap("Settlement_result-blocked.png");

  // AI/ML tab
  await nav('switchTab("aiml"); window.scrollTo(0,0);');
  await new Promise(r => setTimeout(r, 1500));
  await snap("AML_tab.png");

  await nav('window.scrollTo(0, 400);');
  await snap("SHAP_Explainability.png");

  await nav('window.scrollTo(0, 600);');
  await snap("SHAP_Feature_Contribution.png");

  // Risk score
  await nav('switchTab("payments"); switchPaySub("settlement"); window.scrollTo(0, 400);');
  await new Promise(r => setTimeout(r, 1000));
  await snap("Risk_Score.png");
  await snap("Risk_score2.png");

  // Admin HITL
  await nav('switchTab("admin"); window.scrollTo(0,0);');
  await new Promise(r => setTimeout(r, 1500));
  await snap("HITL-Approval-1st.png");

  await nav('window.scrollTo(0, 600);');
  await new Promise(r => setTimeout(r, 1000));
  await snap("Audit_log.png");

  await nav('window.scrollTo(0, 0);');
  await snap("HITL_Approval_2nd.png");
  await snap("four_eyes-message.png");

  await nav('window.scrollTo(0, 1200);');
  await new Promise(r => setTimeout(r, 500));
  await snap("GDPR_Right_to_erase.png");

  // Compliance
  await nav('switchTab("compliance"); window.scrollTo(0,0);');
  await new Promise(r => setTimeout(r, 1500));
  await snap("Sanction_list_Add.png");

  await nav('window.scrollTo(0, 400);');
  await snap("Swift_GPI_tracker.png");

  await nav('window.scrollTo(0, 800);');
  await snap("Currency_converter.png");

  await nav('window.scrollTo(0, 1200);');
  await snap("Nostro_balance.png");

  // Cases
  await nav('switchTab("cases"); window.scrollTo(0,0);');
  await new Promise(r => setTimeout(r, 1500));
  await snap("Cases_Tab.png");
  await snap("Case_details.png");

  await nav(`
    const firstCase = document.querySelector('[onclick*="openCaseModal"]');
    if (firstCase) firstCase.click();
  `);
  await new Promise(r => setTimeout(r, 1000));
  await snap("Case_details_View1.png");
  await nav('document.querySelector(".modal-overlay")?.remove();');

  // DeFi
  await nav('switchTab("defi"); window.scrollTo(0,0);');
  await new Promise(r => setTimeout(r, 2000));
  await snap("DeFi_Swap.png");

  await nav('showDefiSub("stake"); window.scrollTo(0,0);');
  await new Promise(r => setTimeout(r, 1500));
  await snap("DeFi_Staking.png");

  await nav('showDefiSub("escrow"); window.scrollTo(0,0);');
  await new Promise(r => setTimeout(r, 1500));
  await snap("DeFi_Escrow.png");

  // Dashboard Proof of Reserve
  await nav('switchTab("dashboard"); window.scrollTo(0,0);');
  await new Promise(r => setTimeout(r, 2000));
  await snap("Dashboard_ProofOfReserve.png");

  await browser.close();
  console.log("\n=== DONE — All missing high-res screenshots captured ===");
}

run().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
