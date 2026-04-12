const PptxGenJS = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const DOCS_DIR = path.resolve(__dirname);
const SS = path.join(DOCS_DIR, "screenshots");
const ARCH = path.join(DOCS_DIR, "architecture");

// ── Color Palette ─────────────────────────────────────────────
const NAVY = "0C2340";
const GREEN = "10B981";
const DARK = "1A2332";
const WHITE = "FFFFFF";
const LIGHT_BG = "F0F4F8";
const GRAY = "94A3B8";
const RED = "EF4444";
const YELLOW = "F59E0B";
const BLUE = "3B82F6";

// ── Helper: screenshot path ───────────────────────────────────
function ss(name) { return path.join(SS, name); }
function arch(name) { return path.join(ARCH, name); }

// ── Helper: add image safely ──────────────────────────────────
function addImageSafe(slide, filePath, opts) {
  if (fs.existsSync(filePath)) {
    slide.addImage({ path: filePath, ...opts });
  } else {
    console.warn(`  [WARN] Missing: ${filePath}`);
    slide.addText("[Image not found]", { x: opts.x, y: opts.y, w: opts.w, h: opts.h, fontSize: 12, color: "999999", align: "center", valign: "middle" });
  }
}

// ── Create Presentation ───────────────────────────────────────
const pptx = new PptxGenJS();
pptx.author = "Mohamad Idriss, Rohit Jacob Isaac, Sriram Acharya Mudumbai, Walid Elmahdy, Vibin Chandrabose";
pptx.company = "Group 9 — IPTS";
pptx.subject = "IPTS Demo Walkthrough";
pptx.title = "G9-IPTS Demo Walkthrough";
pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

// ── Slide Master Definitions ──────────────────────────────────
pptx.defineSlideMaster({
  title: "TITLE_SLIDE",
  background: { fill: NAVY },
  objects: [
    { rect: { x: 0, y: 6.8, w: 13.33, h: 0.7, fill: { color: GREEN } } },
    { text: { text: "CONFIDENTIAL", options: { x: 0, y: 7.0, w: 13.33, h: 0.3, fontSize: 10, color: WHITE, align: "center", bold: true } } },
  ]
});

pptx.defineSlideMaster({
  title: "CONTENT",
  background: { fill: LIGHT_BG },
  objects: [
    { rect: { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: NAVY } } },
    { rect: { x: 0, y: 7.1, w: 13.33, h: 0.4, fill: { color: NAVY } } },
    { text: { text: "G9-IPTS  |  Demo Walkthrough  |  April 2026", options: { x: 0.3, y: 7.15, w: 10, h: 0.3, fontSize: 9, color: GRAY, align: "left" } } },
    { text: { text: "CONFIDENTIAL", options: { x: 10, y: 7.15, w: 3, h: 0.3, fontSize: 9, color: RED, align: "right", bold: true } } },
  ]
});

pptx.defineSlideMaster({
  title: "SECTION",
  background: { fill: NAVY },
  objects: [
    { rect: { x: 0.5, y: 3.2, w: 4, h: 0.06, fill: { color: GREEN } } },
  ]
});

pptx.defineSlideMaster({
  title: "DARK",
  background: { fill: DARK },
  objects: [
    { rect: { x: 0, y: 7.1, w: 13.33, h: 0.4, fill: { color: NAVY } } },
    { text: { text: "G9-IPTS  |  Demo Walkthrough", options: { x: 0.3, y: 7.15, w: 10, h: 0.3, fontSize: 9, color: GRAY } } },
  ]
});


// ═══════════════════════════════════════════════════════════════
// SLIDE 1 — TITLE
// ═══════════════════════════════════════════════════════════════
let slide = pptx.addSlide({ masterName: "TITLE_SLIDE" });
slide.addText("G9-IPTS", { x: 0.5, y: 1.2, w: 12, h: 1.5, fontSize: 60, bold: true, color: WHITE, fontFace: "Calibri" });
slide.addText("Integrated Payment Transformation System", { x: 0.5, y: 2.6, w: 12, h: 0.7, fontSize: 28, color: GREEN, fontFace: "Calibri" });
slide.addText("Demo Walkthrough & Live System Tour", { x: 0.5, y: 3.3, w: 12, h: 0.6, fontSize: 22, color: GRAY, italic: true, fontFace: "Calibri" });
slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 4.1, w: 3.5, h: 0.04, fill: { color: GREEN } });
slide.addText([
  { text: "Mohamad Idriss  |  Rohit Jacob Isaac  |  Sriram Acharya Mudumbai\n", options: { fontSize: 14, color: WHITE, bold: true } },
  { text: "Walid Elmahdy  |  Vibin Chandrabose", options: { fontSize: 14, color: WHITE, bold: true } },
], { x: 0.5, y: 4.5, w: 12, h: 0.8, fontFace: "Calibri" });
slide.addText("Version 6.0  |  April 2026", { x: 0.5, y: 5.6, w: 12, h: 0.4, fontSize: 16, color: GRAY, fontFace: "Calibri" });


// ═══════════════════════════════════════════════════════════════
// SLIDE 2 — AGENDA
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "CONTENT" });
slide.addText("Demo Agenda", { x: 0.3, y: 0.1, w: 12, h: 0.7, fontSize: 28, bold: true, color: WHITE, fontFace: "Calibri" });
const agendaItems = [
  ["1", "The Problem", "Why cross-border settlements need transformation"],
  ["2", "Architecture Overview", "7-Layer Convergent Architecture"],
  ["3", "Live Dashboard", "KPIs, multi-account, ledger, notifications"],
  ["4", "Payment Hub", "Settlement, P2P, ACH/Wire/SEPA, Scheduled, QR Pay"],
  ["5", "DeFi Suite", "AMM Swap, Staking, Escrow HTLC, Liquidity Pools"],
  ["6", "AI Risk Scoring", "5-model ensemble with SHAP explainability"],
  ["7", "Account & Beneficiaries", "Multi-account, beneficiary management, spending 360"],
  ["8", "Card Services", "Virtual cards, freeze/unfreeze, digital wallet"],
  ["9", "Security & KYC", "E-KYC verification, fraud alerts, biometrics"],
  ["10", "Compliance & Cases", "Four-eyes, HITL, SLA, sanctions, case mgmt"],
  ["11", "Support & Documents", "AI chat bot, notification center, statements"],
  ["12", "Key Differentiators", "What makes IPTS unique"],
];
agendaItems.forEach((item, idx) => {
  const y = 1.1 + idx * 0.50;
  const bgColor = idx % 2 === 0 ? "E8F0FE" : WHITE;
  slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: y, w: 12.3, h: 0.5, fill: { color: bgColor }, rectRadius: 0.05 });
  slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: y, w: 0.55, h: 0.5, fill: { color: NAVY }, rectRadius: 0.05 });
  slide.addText(item[0], { x: 0.5, y: y, w: 0.55, h: 0.5, fontSize: 14, bold: true, color: WHITE, align: "center", valign: "middle" });
  slide.addText(item[1], { x: 1.2, y: y, w: 3.5, h: 0.5, fontSize: 14, bold: true, color: NAVY, valign: "middle" });
  slide.addText(item[2], { x: 4.7, y: y, w: 8, h: 0.5, fontSize: 13, color: "555555", valign: "middle" });
});


// ═══════════════════════════════════════════════════════════════
// SLIDE 3 — THE PROBLEM
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "SECTION" });
slide.addText("The Problem", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 44, bold: true, color: WHITE, fontFace: "Calibri" });
slide.addText("Cross-Border Settlement Today", { x: 0.5, y: 3.5, w: 12, h: 0.7, fontSize: 24, color: GREEN, fontFace: "Calibri" });

slide = pptx.addSlide({ masterName: "CONTENT" });
slide.addText("Why Settlements Need Transformation", { x: 0.3, y: 0.1, w: 12, h: 0.7, fontSize: 26, bold: true, color: WHITE });

const problems = [
  { icon: "\u23F1", title: "T+2 to T+5 Settlement", desc: "Cross-border payments take 2-5 business days through correspondent banking chains" },
  { icon: "\uD83D\uDCB0", title: "$27T Trapped Liquidity", desc: "Nostro/Vostro accounts lock capital globally, creating massive opportunity costs" },
  { icon: "\u26A0\uFE0F", title: "$10.2M Compliance Cost", desc: "Annual AML/KYC compliance with 15-25% false positive rates" },
  { icon: "\uD83D\uDD12", title: "Black Box AI", desc: "Legacy ML systems cannot explain why transactions are blocked" },
  { icon: "\uD83C\uDF10", title: "Fragmented Infrastructure", desc: "$25-$65 per transaction across multiple intermediaries" },
  { icon: "\uD83D\uDCCA", title: "$190T Market", desc: "The cross-border payments market is at an inflection point" },
];
problems.forEach((p, idx) => {
  const col = idx % 2;
  const row = Math.floor(idx / 2);
  const x = 0.5 + col * 6.3;
  const y = 1.1 + row * 1.9;
  slide.addShape(pptx.ShapeType.rect, { x: x, y: y, w: 6, h: 1.7, fill: { color: WHITE }, shadow: { type: "outer", blur: 4, offset: 2, color: "CCCCCC" }, rectRadius: 0.1 });
  slide.addText(p.icon, { x: x + 0.2, y: y + 0.15, w: 0.6, h: 0.6, fontSize: 28 });
  slide.addText(p.title, { x: x + 0.9, y: y + 0.15, w: 4.8, h: 0.5, fontSize: 15, bold: true, color: NAVY });
  slide.addText(p.desc, { x: x + 0.9, y: y + 0.65, w: 4.8, h: 0.9, fontSize: 12, color: "555555", valign: "top" });
});


// ═══════════════════════════════════════════════════════════════
// SLIDE 4 — ARCHITECTURE OVERVIEW
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "SECTION" });
slide.addText("Architecture", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 44, bold: true, color: WHITE });
slide.addText("7-Layer Convergent Architecture", { x: 0.5, y: 3.5, w: 12, h: 0.7, fontSize: 24, color: GREEN });

slide = pptx.addSlide({ masterName: "CONTENT" });
slide.addText("IPTS 7-Layer Convergent Architecture", { x: 0.3, y: 0.1, w: 12, h: 0.7, fontSize: 26, bold: true, color: WHITE });
addImageSafe(slide, arch("ipts_seven_layer_convergent_architecture.png"), { x: 0.3, y: 1.0, w: 7.5, h: 5.8 });

const layers = [
  ["Layer 1", "Presentation", "SPA, SHAP charts, SLA, health"],
  ["Layer 2", "Security", "JWT, RBAC, four-eyes approval"],
  ["Layer 3", "Intelligence", "5 ML models, 16 features, SHAP"],
  ["Layer 4", "Compliance", "HITL, cases, SLA, sanctions, FX"],
  ["Layer 5", "Blockchain", "7 smart contracts, atomic swaps"],
  ["Layer 6", "Data", "GDPR vault, hash anchoring"],
  ["Layer 7", "Infrastructure", "Ganache, Flask, health monitoring"],
];
layers.forEach((l, idx) => {
  const y = 1.1 + idx * 0.82;
  const color = [GREEN, BLUE, "8B5CF6", YELLOW, "F97316", RED, NAVY][idx];
  slide.addShape(pptx.ShapeType.rect, { x: 8.1, y: y, w: 0.12, h: 0.7, fill: { color } });
  slide.addText(l[0], { x: 8.35, y: y, w: 1.3, h: 0.35, fontSize: 10, bold: true, color: NAVY });
  slide.addText(l[1], { x: 9.6, y: y, w: 1.5, h: 0.35, fontSize: 10, bold: true, color: color });
  slide.addText(l[2], { x: 8.35, y: y + 0.3, w: 4.5, h: 0.4, fontSize: 9, color: "666666" });
});


// ═══════════════════════════════════════════════════════════════
// SLIDE 5 — TECHNOLOGY STACK
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "CONTENT" });
slide.addText("Technology Stack", { x: 0.3, y: 0.1, w: 12, h: 0.7, fontSize: 26, bold: true, color: WHITE });

const techStack = [
  { cat: "Blockchain", items: "7 Solidity Contracts\nWeb3.py 6.15  |  Ganache\npy-solc-x 2.0", color: "8B5CF6" },
  { cat: "AI/ML", items: "5-Model Ensemble\n16-Feature Vector  |  SHAP\nVelocityTracker  |  SMOTE", color: GREEN },
  { cat: "Security", items: "Zero Trust JWT\nRBAC (5 roles)  |  Four-Eyes\nRate Limiting  |  HSTS", color: RED },
  { cat: "Backend", items: "Flask 3.0  |  SQLite\n22 Database Tables  |  75+ APIs\nSSE Streaming  |  REST API", color: BLUE },
  { cat: "Frontend", items: "Tailwind CSS  |  Chart.js\nD3.js Network Graph\n12 Tabs  |  Dark Theme", color: YELLOW },
  { cat: "Compliance", items: "HITL + SLA Tracking  |  E-KYC\nSAR Filing  |  SWIFT GPI\n13-Currency FX  |  Fraud Alerts", color: "F97316" },
  { cat: "DeFi", items: "AMM Swap  |  Liquidity Pools\nStaking Rewards  |  Escrow HTLC\nProof of Reserve", color: "06B6D4" },
];
techStack.forEach((t, idx) => {
  const col = idx % 4;
  const row = Math.floor(idx / 4);
  const x = 0.3 + col * 3.25;
  const y = 1.1 + row * 3.0;
  slide.addShape(pptx.ShapeType.rect, { x: x, y: y, w: 3.05, h: 2.6, fill: { color: WHITE }, shadow: { type: "outer", blur: 4, offset: 2, color: "CCCCCC" }, rectRadius: 0.1 });
  slide.addShape(pptx.ShapeType.rect, { x: x, y: y, w: 3.05, h: 0.06, fill: { color: t.color }, rectRadius: 0.05 });
  slide.addText(t.cat, { x: x + 0.2, y: y + 0.2, w: 2.65, h: 0.5, fontSize: 15, bold: true, color: NAVY });
  slide.addText(t.items, { x: x + 0.2, y: y + 0.8, w: 2.65, h: 1.6, fontSize: 11, color: "555555", lineSpacingMultiple: 1.4 });
});


// ═══════════════════════════════════════════════════════════════
// SLIDE 6 — DEMO: DASHBOARD
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "SECTION" });
slide.addText("Live Demo", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 44, bold: true, color: WHITE });
slide.addText("Dashboard & Real-Time Monitoring", { x: 0.5, y: 3.5, w: 12, h: 0.7, fontSize: 24, color: GREEN });

slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Dashboard — Multi-Account, KPIs & Notifications", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Dashboard_MultiAccount.png"), { x: 0.3, y: 0.8, w: 8.5, h: 5.3 });
slide.addShape(pptx.ShapeType.rect, { x: 9.1, y: 0.8, w: 4, h: 5.3, fill: { color: "1E293B" }, rectRadius: 0.1 });
const dashPoints = [
  "Real-time KPI cards",
  "Multi-account cards",
  "Checking / Savings / Business",
  "Notification bell + badge",
  "Live FX rates ticker",
  "Health status dot (30s poll)",
  "SSE auto-refresh (6s)",
];
dashPoints.forEach((p, idx) => {
  slide.addText("\u2022  " + p, { x: 9.3, y: 1.0 + idx * 0.65, w: 3.5, h: 0.5, fontSize: 13, color: WHITE });
});

// Dashboard ledger + notifications
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Dashboard — Real-Time Ledger & Notifications", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Dashboard_Ledger.png"), { x: 0.3, y: 0.8, w: 6.3, h: 5.5 });
addImageSafe(slide, ss("Notifications_Panel.png"), { x: 6.8, y: 0.8, w: 6.3, h: 5.5 });

// Dashboard telemetry
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Dashboard — Settlement Volume & AML Telemetry", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Dashboard + AMLl.png"), { x: 0.5, y: 0.9, w: 12.3, h: 5.8 });

// Dashboard Proof of Reserve
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Dashboard — Proof of Reserve", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Dashboard_ProofOfReserve.png"), { x: 0.5, y: 0.9, w: 12.3, h: 5.8 });


// ═══════════════════════════════════════════════════════════════
// SLIDE 7 — DEMO: PAYMENT EXECUTION
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "SECTION" });
slide.addText("Payment Hub", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 44, bold: true, color: WHITE });
slide.addText("5 Payment Channels: Settlement, P2P, ACH/Wire/SEPA, Scheduled, QR", { x: 0.5, y: 3.5, w: 12, h: 0.7, fontSize: 22, color: GREEN });

slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Settlement — Multi-Currency with AI Risk Scoring", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Payment_Settlement.png"), { x: 0.3, y: 0.8, w: 8, h: 5.0 });
slide.addShape(pptx.ShapeType.rect, { x: 8.6, y: 0.8, w: 4.5, h: 5.0, fill: { color: "1E293B" }, rectRadius: 0.1 });
const payPoints = [
  "13-currency selector",
  "FX preview (USD equivalent)",
  "AML jurisdiction warnings",
  "Risk score + breakdown",
  "SHAP values inline",
  "Blockchain tx hash",
  "Balance auto-update",
];
payPoints.forEach((p, idx) => {
  slide.addText("\u2022  " + p, { x: 8.8, y: 1.0 + idx * 0.65, w: 4, h: 0.5, fontSize: 13, color: WHITE });
});

// P2P + ACH/Wire/SEPA
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("P2P Transfer & ACH/Wire/SEPA", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Payment_P2P.png"), { x: 0.3, y: 0.8, w: 6.3, h: 5.5 });
addImageSafe(slide, ss("Payment_ACH_Wire_SEPA.png"), { x: 6.8, y: 0.8, w: 6.3, h: 5.5 });

// Scheduled + QR Pay
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Scheduled Payments & QR Pay", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Payment_Scheduled.png"), { x: 0.3, y: 0.8, w: 6.3, h: 5.5 });
addImageSafe(slide, ss("Payment_QR_Pay.png"), { x: 6.8, y: 0.8, w: 6.3, h: 5.5 });

// Settlement blocked
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Settlement — $700K High-Value Transaction (Blocked)", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Settlement_result-blocked.png"), { x: 0.5, y: 0.9, w: 12.3, h: 5.8 });


// ═══════════════════════════════════════════════════════════════
// SLIDE — DeFi SUITE
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "SECTION" });
slide.addText("DeFi Suite", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 44, bold: true, color: WHITE });
slide.addText("AMM Swap, Staking, Escrow HTLC, Liquidity Pools", { x: 0.5, y: 3.5, w: 12, h: 0.7, fontSize: 24, color: GREEN });

// DeFi AMM Swap
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("DeFi — AMM Swap & Liquidity Pools", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("DeFi_Swap.png"), { x: 0.3, y: 0.8, w: 8.5, h: 5.3 });
slide.addShape(pptx.ShapeType.rect, { x: 9.1, y: 0.8, w: 4, h: 5.3, fill: { color: "1E293B" }, rectRadius: 0.1 });
const defiSwapPoints = [
  "Automated Market Maker",
  "Token-to-token swaps",
  "Slippage protection",
  "Liquidity pool balances",
  "Price impact preview",
  "On-chain settlement",
  "Real-time pricing",
];
defiSwapPoints.forEach((p, idx) => {
  slide.addText("\u2022  " + p, { x: 9.3, y: 1.0 + idx * 0.65, w: 3.5, h: 0.5, fontSize: 13, color: WHITE });
});

// DeFi Staking
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("DeFi — Staking Rewards", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("DeFi_Staking.png"), { x: 0.5, y: 0.9, w: 12.3, h: 5.8 });

// DeFi Escrow HTLC
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("DeFi — Escrow HTLC (Hash Time-Locked Contracts)", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("DeFi_Escrow.png"), { x: 0.5, y: 0.9, w: 12.3, h: 5.8 });


// ═══════════════════════════════════════════════════════════════
// SLIDE 8 — SHAP EXPLAINABILITY
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "SECTION" });
slide.addText("SHAP Explainability", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 44, bold: true, color: WHITE });
slide.addText("Every AI Decision is Fully Transparent", { x: 0.5, y: 3.5, w: 12, h: 0.7, fontSize: 24, color: GREEN });

slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("SHAP — Per-Transaction Feature Contributions", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("SHAP_Explainability.png"), { x: 0.3, y: 0.8, w: 7.5, h: 5.5 });
slide.addShape(pptx.ShapeType.rect, { x: 8.1, y: 0.8, w: 5, h: 5.5, fill: { color: "1E293B" }, rectRadius: 0.1 });
slide.addText("How SHAP Works", { x: 8.3, y: 1.0, w: 4.5, h: 0.5, fontSize: 16, bold: true, color: GREEN });
const shapPoints = [
  "16 features scored per transaction",
  "TreeExplainer on XGBoost model",
  "RF feature_importances_ fallback",
  "Positive = increases risk (red)",
  "Negative = decreases risk (green)",
  "Satisfies EU AI Act requirements",
  "Full audit trail for regulators",
];
shapPoints.forEach((p, idx) => {
  slide.addText("\u2022  " + p, { x: 8.3, y: 1.6 + idx * 0.6, w: 4.5, h: 0.5, fontSize: 12, color: WHITE });
});

// Score breakdown
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Risk Score Breakdown — 4-Component Composite Scoring", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Risk_Score.png"), { x: 1, y: 1.2, w: 5, h: 2.5 });
addImageSafe(slide, ss("Risk_score2.png"), { x: 7, y: 1.2, w: 5, h: 2.5 });
// Component labels
const components = [
  { name: "Rules (30%)", desc: "Deterministic threshold checks", color: GREEN },
  { name: "ML Ensemble (40%)", desc: "5-model weighted prediction", color: BLUE },
  { name: "NLP Watchlist (15%)", desc: "Fuzzy entity matching", color: YELLOW },
  { name: "Graph Risk (15%)", desc: "PageRank centrality analysis", color: "8B5CF6" },
];
components.forEach((c, idx) => {
  const x = 0.5 + idx * 3.2;
  slide.addShape(pptx.ShapeType.rect, { x: x, y: 4.3, w: 3, h: 1.8, fill: { color: "1E293B" }, rectRadius: 0.08 });
  slide.addShape(pptx.ShapeType.rect, { x: x, y: 4.3, w: 3, h: 0.05, fill: { color: c.color } });
  slide.addText(c.name, { x: x + 0.15, y: 4.5, w: 2.7, h: 0.5, fontSize: 13, bold: true, color: WHITE });
  slide.addText(c.desc, { x: x + 0.15, y: 5.0, w: 2.7, h: 0.8, fontSize: 11, color: GRAY });
});


// ═══════════════════════════════════════════════════════════════
// SLIDE 9 — AI/ML MODELS
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "SECTION" });
slide.addText("AI/ML Engine", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 44, bold: true, color: WHITE });
slide.addText("5-Model Ensemble with 16-Feature Vector", { x: 0.5, y: 3.5, w: 12, h: 0.7, fontSize: 24, color: GREEN });

slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("AI/ML — 5 Model Performance Cards", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("AIML_Models.png"), { x: 0.5, y: 0.9, w: 12.3, h: 5.8 });

// SHAP chart slide
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("SHAP Explainability Chart — Feature Impact on Risk", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("SHAP_Feature_Contribution.png"), { x: 1.5, y: 0.9, w: 10, h: 5.5 });

// 16-feature vector slide
slide = pptx.addSlide({ masterName: "CONTENT" });
slide.addText("16-Feature Vector — Static + Real-Time Velocity", { x: 0.3, y: 0.1, w: 12, h: 0.7, fontSize: 24, bold: true, color: WHITE });

const staticFeatures = ["amount", "hour", "day_of_week", "freq_7d", "is_round", "country_risk", "sender_id", "receiver_id"];
const rtFeatures = ["velocity_1h", "velocity_24h", "velocity_7d", "avg_tx_amount", "std_tx_amount", "amount_zscore", "unique_receivers_7d", "is_new_receiver"];

slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.0, w: 6, h: 0.5, fill: { color: NAVY }, rectRadius: 0.05 });
slide.addText("Static Features (1-8)", { x: 0.5, y: 1.0, w: 6, h: 0.5, fontSize: 14, bold: true, color: WHITE, align: "center", valign: "middle" });
staticFeatures.forEach((f, idx) => {
  const col = idx % 2;
  const row = Math.floor(idx / 2);
  slide.addShape(pptx.ShapeType.rect, { x: 0.5 + col * 3, y: 1.6 + row * 0.55, w: 2.8, h: 0.45, fill: { color: idx % 2 === 0 ? "E8F0FE" : WHITE }, rectRadius: 0.05 });
  slide.addText(`${idx + 1}. ${f}`, { x: 0.7 + col * 3, y: 1.6 + row * 0.55, w: 2.5, h: 0.45, fontSize: 12, color: NAVY, valign: "middle" });
});

slide.addShape(pptx.ShapeType.rect, { x: 7, y: 1.0, w: 6, h: 0.5, fill: { color: GREEN }, rectRadius: 0.05 });
slide.addText("Real-Time Velocity Features (9-16)", { x: 7, y: 1.0, w: 6, h: 0.5, fontSize: 14, bold: true, color: WHITE, align: "center", valign: "middle" });
rtFeatures.forEach((f, idx) => {
  const col = idx % 2;
  const row = Math.floor(idx / 2);
  slide.addShape(pptx.ShapeType.rect, { x: 7 + col * 3, y: 1.6 + row * 0.55, w: 2.8, h: 0.45, fill: { color: idx % 2 === 0 ? "ECFDF5" : WHITE }, rectRadius: 0.05 });
  slide.addText(`${idx + 9}. ${f}`, { x: 7.2 + col * 3, y: 1.6 + row * 0.55, w: 2.5, h: 0.45, fontSize: 12, color: DARK, valign: "middle" });
});

slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 4.0, w: 12.3, h: 2.8, fill: { color: WHITE }, shadow: { type: "outer", blur: 3, offset: 1, color: "CCCCCC" }, rectRadius: 0.1 });
slide.addText("VelocityTracker — Real-Time Behavioral Analytics", { x: 0.8, y: 4.1, w: 11, h: 0.5, fontSize: 16, bold: true, color: NAVY });
slide.addText("The VelocityTracker maintains a per-sender sliding window of transaction history, computing real-time features that capture behavioral anomalies invisible to static analysis. This enables detection of sudden volume spikes, amount deviations, and receiver diversification patterns that indicate fraud, structuring, or money laundering.", { x: 0.8, y: 4.7, w: 11.5, h: 1.8, fontSize: 13, color: "444444", lineSpacingMultiple: 1.5 });

// Fraud Heatmap
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Fraud Heatmap — Geographic & Temporal Analysis", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Fraud_Heatmap.png"), { x: 0.5, y: 0.9, w: 12.3, h: 5.8 });


// ═══════════════════════════════════════════════════════════════
// SLIDE 10 — FOUR-EYES APPROVAL
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "SECTION" });
slide.addText("Four-Eyes Approval", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 44, bold: true, color: WHITE });
slide.addText("Dual-Approval for High-Value Transactions ($100K+)", { x: 0.5, y: 3.5, w: 12, h: 0.7, fontSize: 24, color: GREEN });

slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("HITL Queue — Four-Eyes Approval Badges", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Admin_HITL.png"), { x: 0.3, y: 0.8, w: 8.5, h: 5.3 });
slide.addShape(pptx.ShapeType.rect, { x: 9.1, y: 0.8, w: 4, h: 5.3, fill: { color: "1E293B" }, rectRadius: 0.1 });
slide.addText("Four-Eyes Workflow", { x: 9.3, y: 1.0, w: 3.5, h: 0.5, fontSize: 16, bold: true, color: GREEN });
const feSteps = [
  { badge: "Required", color: "F97316", text: "Transaction >= $100K blocked" },
  { badge: "1 of 2", color: YELLOW, text: "First officer approves" },
  { badge: "Enforced", color: RED, text: "Same user cannot approve twice" },
  { badge: "2 of 2", color: GREEN, text: "Second officer confirms" },
  { badge: "Settled", color: BLUE, text: "Released to blockchain" },
];
feSteps.forEach((s, idx) => {
  const y = 1.7 + idx * 0.85;
  slide.addShape(pptx.ShapeType.rect, { x: 9.3, y: y, w: 1.2, h: 0.35, fill: { color: s.color }, rectRadius: 0.1 });
  slide.addText(s.badge, { x: 9.3, y: y, w: 1.2, h: 0.35, fontSize: 9, bold: true, color: WHITE, align: "center", valign: "middle" });
  slide.addText(s.text, { x: 10.7, y: y, w: 2.3, h: 0.55, fontSize: 11, color: WHITE });
});

// Four-eyes dialog
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Four-Eyes Enforcement — Second Approver Required", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("four_eyes-message.png"), { x: 2, y: 1.5, w: 9, h: 4.0 });
slide.addText("The system enforces that the second approval must come from a different compliance officer.\nNo single individual can unilaterally approve high-value transactions.", { x: 1, y: 5.8, w: 11, h: 1.0, fontSize: 14, color: GRAY, align: "center", italic: true });

// HITL detail view
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("HITL Queue — Detailed Case View", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("HITL_Approval_2nd.png"), { x: 0.5, y: 0.9, w: 12.3, h: 5.8 });


// ═══════════════════════════════════════════════════════════════
// SLIDE 11 — CASE MANAGEMENT
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "SECTION" });
slide.addText("Case Management", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 44, bold: true, color: WHITE });
slide.addText("SLA Tracking & Compliance Workflows", { x: 0.5, y: 3.5, w: 12, h: 0.7, fontSize: 24, color: GREEN });

slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Case Management — SLA Countdown Tracking", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Cases_Tab.png"), { x: 0.3, y: 0.8, w: 8.5, h: 5.3 });
slide.addShape(pptx.ShapeType.rect, { x: 9.1, y: 0.8, w: 4, h: 5.3, fill: { color: "1E293B" }, rectRadius: 0.1 });
slide.addText("SLA Thresholds", { x: 9.3, y: 1.0, w: 3.5, h: 0.5, fontSize: 16, bold: true, color: GREEN });
const slaItems = [
  { sev: "CRITICAL", time: "4 hours", color: RED },
  { sev: "HIGH", time: "24 hours", color: "F97316" },
  { sev: "MEDIUM", time: "72 hours", color: YELLOW },
  { sev: "LOW", time: "7 days", color: GREEN },
];
slaItems.forEach((s, idx) => {
  const y = 1.7 + idx * 0.9;
  slide.addShape(pptx.ShapeType.rect, { x: 9.3, y: y, w: 1.5, h: 0.35, fill: { color: s.color }, rectRadius: 0.1 });
  slide.addText(s.sev, { x: 9.3, y: y, w: 1.5, h: 0.35, fontSize: 10, bold: true, color: WHITE, align: "center", valign: "middle" });
  slide.addText(s.time, { x: 11, y: y, w: 2, h: 0.35, fontSize: 13, bold: true, color: WHITE, valign: "middle" });
});
slide.addText("Cases approaching SLA breach\nare highlighted in red", { x: 9.3, y: 5.5, w: 3.5, h: 0.6, fontSize: 11, color: GRAY, italic: true });

// Case detail
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Case Detail — SANCTIONS Case (CRITICAL)", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Case_details_View1.png"), { x: 0.5, y: 0.8, w: 6.5, h: 5.5 });
addImageSafe(slide, ss("Audit_log.png"), { x: 7.2, y: 0.8, w: 5.8, h: 5.5 });


// ═══════════════════════════════════════════════════════════════
// SLIDE — BENEFICIARIES & SPENDING 360
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "SECTION" });
slide.addText("Account Management", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 44, bold: true, color: WHITE });
slide.addText("Beneficiaries, Spending 360 Analytics", { x: 0.5, y: 3.5, w: 12, h: 0.7, fontSize: 24, color: GREEN });

slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Beneficiary Management — Add, Edit, Delete", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Beneficiaries_Tab.png"), { x: 0.3, y: 0.8, w: 8.5, h: 5.3 });
slide.addShape(pptx.ShapeType.rect, { x: 9.1, y: 0.8, w: 4, h: 5.3, fill: { color: "1E293B" }, rectRadius: 0.1 });
const benPoints = [
  "Add beneficiaries with full details",
  "Account number + SWIFT code",
  "Country + Currency selection",
  "Risk level assignment",
  "Auto-populates payment dropdown",
  "Edit & delete controls",
  "Individual / Corporate types",
];
benPoints.forEach((p, idx) => {
  slide.addText("\u2022  " + p, { x: 9.3, y: 1.0 + idx * 0.65, w: 3.5, h: 0.5, fontSize: 13, color: WHITE });
});

// Spending 360
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Spending 360 — Comprehensive Analytics Dashboard", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Spending_360_Overview.png"), { x: 0.5, y: 0.9, w: 12.3, h: 5.8 });

slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Spending 360 — Charts & Transaction History", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Spending_360_Charts.png"), { x: 0.3, y: 0.8, w: 6.3, h: 5.5 });
addImageSafe(slide, ss("Spending_360_Transactions.png"), { x: 6.8, y: 0.8, w: 6.3, h: 5.5 });


// ═══════════════════════════════════════════════════════════════
// SLIDE — CARD SERVICES
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "SECTION" });
slide.addText("Card Services", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 44, bold: true, color: WHITE });
slide.addText("Virtual Cards, Digital Wallet, Spending Controls", { x: 0.5, y: 3.5, w: 12, h: 0.7, fontSize: 24, color: GREEN });

slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Virtual Cards — Generate, Freeze, Provision", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Cards_Tab.png"), { x: 0.3, y: 0.8, w: 8.5, h: 5.3 });
slide.addShape(pptx.ShapeType.rect, { x: 9.1, y: 0.8, w: 4, h: 5.3, fill: { color: "1E293B" }, rectRadius: 0.1 });
const cardPoints = [
  "Visa / Mastercard generation",
  "Masked card numbers",
  "Gradient card styling",
  "Freeze / Unfreeze toggle",
  "Apple Pay provisioning",
  "Google Pay provisioning",
  "Samsung Pay provisioning",
  "Card cancellation",
];
cardPoints.forEach((p, idx) => {
  slide.addText("\u2022  " + p, { x: 9.3, y: 1.0 + idx * 0.55, w: 3.5, h: 0.45, fontSize: 12, color: WHITE });
});


// ═══════════════════════════════════════════════════════════════
// SLIDE — SECURITY & KYC
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "SECTION" });
slide.addText("Security & KYC", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 44, bold: true, color: WHITE });
slide.addText("E-KYC Verification, Fraud Alerts, Biometric Controls", { x: 0.5, y: 3.5, w: 12, h: 0.7, fontSize: 24, color: GREEN });

slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("E-KYC & Fraud Monitoring", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Security_KYC.png"), { x: 0.3, y: 0.8, w: 6.3, h: 5.5 });
addImageSafe(slide, ss("Security_Fraud_Alerts.png"), { x: 6.8, y: 0.8, w: 6.3, h: 5.5 });


// ═══════════════════════════════════════════════════════════════
// SLIDE — DOCUMENTS & SUPPORT
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "SECTION" });
slide.addText("Support & Documents", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 44, bold: true, color: WHITE });
slide.addText("AI Chat Bot, Notification Center, Document Hub", { x: 0.5, y: 3.5, w: 12, h: 0.7, fontSize: 24, color: GREEN });

slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Documents & Notification Center", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Documents_Tab.png"), { x: 0.3, y: 0.8, w: 6.3, h: 5.5 });
addImageSafe(slide, ss("Notifications_Panel.png"), { x: 6.8, y: 0.8, w: 6.3, h: 5.5 });

// Support Chat with LLM
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Support Chat — LLM-Powered AI Assistant", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Support_Chat.png"), { x: 0.5, y: 0.9, w: 12.3, h: 5.8 });


// ═══════════════════════════════════════════════════════════════
// SLIDE — COMPLIANCE TOOLS
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "SECTION" });
slide.addText("Compliance Tools", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 44, bold: true, color: WHITE });
slide.addText("Sanctions, SWIFT GPI, FX Converter, Nostro", { x: 0.5, y: 3.5, w: 12, h: 0.7, fontSize: 24, color: GREEN });

slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Compliance — Overview & Tools", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Compliance_Tab.png"), { x: 0.5, y: 0.9, w: 12.3, h: 5.8 });

// FX + Nostro
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("FX Converter & Nostro Balances", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Currency_converter.png"), { x: 0.5, y: 0.9, w: 5.5, h: 3.5 });
addImageSafe(slide, ss("Nostro_balance.png"), { x: 6.5, y: 0.9, w: 6.3, h: 3.5 });
slide.addText("13 Supported Currencies", { x: 0.5, y: 4.6, w: 5.5, h: 0.4, fontSize: 13, bold: true, color: GREEN, align: "center" });
slide.addText("USD  EUR  GBP  JPY  CHF  AUD  CAD\nCNY  INR  SGD  AED  SAR  BRL", { x: 0.5, y: 5.1, w: 5.5, h: 0.9, fontSize: 14, color: WHITE, align: "center", lineSpacingMultiple: 1.5 });
slide.addText("Nostro Account Positions", { x: 6.5, y: 4.6, w: 6.3, h: 0.4, fontSize: 13, bold: true, color: GREEN, align: "center" });
slide.addText("Real-time liquidity monitoring across\nblockchain-backed Nostro accounts", { x: 6.5, y: 5.1, w: 6.3, h: 0.9, fontSize: 13, color: GRAY, align: "center", lineSpacingMultiple: 1.5 });

// Network Graph
slide = pptx.addSlide({ masterName: "DARK" });
slide.addText("Network Graph — Transaction Relationship Analysis", { x: 0.3, y: 0.1, w: 12, h: 0.6, fontSize: 22, bold: true, color: WHITE });
addImageSafe(slide, ss("Network_Graph_Full.png"), { x: 0.3, y: 0.8, w: 6.3, h: 5.5 });
addImageSafe(slide, ss("Network_Graph_Connected.png"), { x: 6.8, y: 0.8, w: 6.3, h: 5.5 });


// ═══════════════════════════════════════════════════════════════
// SLIDE 13 — KEY DIFFERENTIATORS
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "CONTENT" });
slide.addText("Key Differentiators", { x: 0.3, y: 0.1, w: 12, h: 0.7, fontSize: 26, bold: true, color: WHITE });

const diffs = [
  { title: "Explainable AI", desc: "Per-transaction SHAP values with 16-feature decomposition. Every risk decision is transparent and auditable — EU AI Act compliant.", icon: "\uD83E\uDDE0", color: "8B5CF6" },
  { title: "5 Payment Channels", desc: "Settlement, P2P, ACH/Wire/SEPA, Scheduled, QR Pay — all in one unified Payment Hub with sub-tab navigation.", icon: "\uD83D\uDCB3", color: BLUE },
  { title: "5-Model Ensemble", desc: "Isolation Forest + Random Forest + XGBoost + Autoencoder + Sequence Detector. 98-100% detection, < 3% false positives.", icon: "\uD83E\uDD16", color: GREEN },
  { title: "Virtual Card Services", desc: "Visa/MC generation, freeze/unfreeze, spending controls, and one-click provisioning to Apple Pay, Google Pay, Samsung Pay.", icon: "\uD83D\uDCB3", color: "F97316" },
  { title: "Spending 360", desc: "Comprehensive analytics with monthly trends, risk distribution, currency breakdown, activity heatmaps, and top beneficiary rankings.", icon: "\uD83D\uDCCA", color: YELLOW },
  { title: "E-KYC + Notifications", desc: "3-phase animated identity verification, real-time notification center with SSE push, and AI-powered support chat bot.", icon: "\uD83D\uDD12", color: RED },
  { title: "DeFi / AMM Suite", desc: "On-chain AMM swaps, staking rewards, escrow HTLC, liquidity pools, and Proof of Reserve — bridging TradFi and DeFi.", icon: "\uD83D\uDD17", color: "06B6D4" },
];
diffs.forEach((d, idx) => {
  const col = idx % 4;
  const row = Math.floor(idx / 4);
  const x = 0.3 + col * 3.25;
  const y = 1.1 + row * 3.0;
  slide.addShape(pptx.ShapeType.rect, { x: x, y: y, w: 3.05, h: 2.7, fill: { color: WHITE }, shadow: { type: "outer", blur: 4, offset: 2, color: "CCCCCC" }, rectRadius: 0.1 });
  slide.addShape(pptx.ShapeType.rect, { x: x, y: y, w: 3.05, h: 0.06, fill: { color: d.color }, rectRadius: 0.05 });
  slide.addText(d.icon, { x: x + 0.15, y: y + 0.2, w: 0.5, h: 0.5, fontSize: 24 });
  slide.addText(d.title, { x: x + 0.7, y: y + 0.25, w: 2.2, h: 0.5, fontSize: 14, bold: true, color: NAVY });
  slide.addText(d.desc, { x: x + 0.15, y: y + 0.9, w: 2.75, h: 1.6, fontSize: 10, color: "555555", lineSpacingMultiple: 1.4 });
});


// ═══════════════════════════════════════════════════════════════
// SLIDE 14 — KPI COMPARISON
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "CONTENT" });
slide.addText("Transformation Impact", { x: 0.3, y: 0.1, w: 12, h: 0.7, fontSize: 26, bold: true, color: WHITE });

// Table header
const tableX = 0.5, tableY = 1.1, colW = [4.1, 4.1, 4.1];
slide.addShape(pptx.ShapeType.rect, { x: tableX, y: tableY, w: 12.3, h: 0.5, fill: { color: NAVY }, rectRadius: 0.05 });
slide.addText("KPI Metric", { x: tableX, y: tableY, w: colW[0], h: 0.5, fontSize: 13, bold: true, color: WHITE, align: "center", valign: "middle" });
slide.addText("Before IPTS", { x: tableX + colW[0], y: tableY, w: colW[1], h: 0.5, fontSize: 13, bold: true, color: WHITE, align: "center", valign: "middle" });
slide.addText("After IPTS v6.0", { x: tableX + colW[0] + colW[1], y: tableY, w: colW[2], h: 0.5, fontSize: 13, bold: true, color: WHITE, align: "center", valign: "middle" });

const kpis = [
  ["Settlement Time", "T+2 to T+5", "< 10 seconds"],
  ["Fraud Detection", "45-60%", "98-100%"],
  ["False Positives", "15-25%", "< 3%"],
  ["AI Explainability", "None (black box)", "Full SHAP (16 features)"],
  ["Payment Channels", "1 (wire only)", "5 (Settlement/P2P/ACH/Sched/QR)"],
  ["Currency Support", "USD only", "13 currencies"],
  ["Card Services", "Physical only", "Virtual Visa/MC + digital wallet"],
  ["Identity (KYC)", "Manual paper", "E-KYC with AI scoring"],
  ["Tabs / Features", "3-5 screens", "12 tabs, 75+ API endpoints"],
  ["DeFi Liquidity Pools", "None", "AMM swap + pool management"],
  ["Staking", "None", "On-chain staking with rewards"],
  ["Escrow", "None", "HTLC smart contract escrow"],
];
kpis.forEach((row, idx) => {
  const y = tableY + 0.5 + idx * 0.45;
  const bg = idx % 2 === 0 ? "EDF2F7" : WHITE;
  slide.addShape(pptx.ShapeType.rect, { x: tableX, y: y, w: 12.3, h: 0.45, fill: { color: bg } });
  slide.addText(row[0], { x: tableX + 0.2, y: y, w: colW[0] - 0.2, h: 0.45, fontSize: 11, bold: true, color: NAVY, valign: "middle" });
  slide.addText(row[1], { x: tableX + colW[0], y: y, w: colW[1], h: 0.45, fontSize: 11, color: "666666", align: "center", valign: "middle" });
  slide.addText(row[2], { x: tableX + colW[0] + colW[1], y: y, w: colW[2], h: 0.45, fontSize: 11, bold: true, color: GREEN, align: "center", valign: "middle" });
});


// ═══════════════════════════════════════════════════════════════
// SLIDE 15 — THANK YOU / Q&A
// ═══════════════════════════════════════════════════════════════
slide = pptx.addSlide({ masterName: "TITLE_SLIDE" });
slide.addText("Thank You", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 54, bold: true, color: WHITE, fontFace: "Calibri" });
slide.addText("Questions & Discussion", { x: 0.5, y: 2.8, w: 12, h: 0.7, fontSize: 28, color: GREEN, fontFace: "Calibri" });
slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 3.7, w: 3.5, h: 0.04, fill: { color: GREEN } });

slide.addText([
  { text: "G9-IPTS v6.0\n", options: { fontSize: 16, bold: true, color: WHITE } },
  { text: "7-Layer Architecture  |  5 AI Models  |  SHAP Explainability\n", options: { fontSize: 14, color: GRAY } },
  { text: "12 Tabs  |  5 Payment Channels  |  DeFi Suite  |  Virtual Cards  |  E-KYC\n", options: { fontSize: 14, color: GRAY } },
  { text: "AMM Swap  |  Staking  |  Escrow HTLC  |  Support Chat  |  75+ APIs", options: { fontSize: 14, color: GRAY } },
], { x: 0.5, y: 4.2, w: 12, h: 1.8, fontFace: "Calibri", lineSpacingMultiple: 1.5 });

slide.addText([
  { text: "Mohamad Idriss  |  Rohit Jacob Isaac  |  Sriram Acharya Mudumbai\n", options: { fontSize: 12, color: GRAY } },
  { text: "Walid Elmahdy  |  Vibin Chandrabose", options: { fontSize: 12, color: GRAY } },
], { x: 0.5, y: 6.0, w: 12, h: 0.6, fontFace: "Calibri" });


// ═══════════════════════════════════════════════════════════════
// GENERATE
// ═══════════════════════════════════════════════════════════════
const outPath = path.join(DOCS_DIR, "G9-IPTS_Demo_Walkthrough.pptx");
pptx.writeFile({ fileName: outPath })
  .then(() => {
    const size = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`Presentation generated: ${outPath} (${size} KB)`);
  })
  .catch(err => {
    console.error("Error generating presentation:", err);
    process.exit(1);
  });
