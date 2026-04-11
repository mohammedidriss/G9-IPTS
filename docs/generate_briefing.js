const fs = require("fs");
const path = require("path");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat,
        TableOfContents, HeadingLevel, BorderStyle, WidthType, ShadingType,
        PageNumber, PageBreak, ImageRun } = require("docx");

// ── Shared Styles ──────────────────────────────────────────────
const FONT = "Calibri";
const C1 = "0C2340";   // Navy primary
const C2 = "10B981";   // Green accent
const COLOR_DARK = "1A2332";
const COLOR_LIGHT_BG = "F0F4F8";
const COLOR_TABLE_HEAD = "0C2340";
const COLOR_TABLE_HEAD_TEXT = "FFFFFF";
const COLOR_TABLE_ALT = "EDF2F7";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorders = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

const PAGE_WIDTH = 12240;
const MARGINS = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGINS; // 9360

// ── Image Paths ────────────────────────────────────────────────
const DOCS_DIR = path.resolve(__dirname);
const SCREENSHOTS_DIR = path.join(DOCS_DIR, "screenshots");
const ARCH_DIR = path.join(DOCS_DIR, "architecture");

// ── Helper Functions ───────────────────────────────────────────
function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, font: FONT, size: 32, bold: true, color: C1 })]
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, font: FONT, size: 26, bold: true, color: COLOR_DARK })]
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, font: FONT, size: 22, bold: true, color: COLOR_DARK })]
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, font: FONT, size: 22, color: "333333", ...opts })]
  });
}

function boldPara(label, text) {
  return new Paragraph({
    spacing: { after: 120 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({ text: label, font: FONT, size: 22, bold: true, color: COLOR_DARK }),
      new TextRun({ text, font: FONT, size: 22, color: "333333" })
    ]
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: FONT, size: 22, color: "333333" })]
  });
}

function bulletBold(label, text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 60 },
    children: [
      new TextRun({ text: label, font: FONT, size: 22, bold: true, color: COLOR_DARK }),
      new TextRun({ text, font: FONT, size: 22, color: "333333" })
    ]
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function emptyLine() {
  return new Paragraph({ spacing: { after: 80 }, children: [] });
}

function makeHeaderCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: COLOR_TABLE_HEAD, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 20, bold: true, color: COLOR_TABLE_HEAD_TEXT })] })]
  });
}

function makeCell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      children: [new TextRun({ text, font: FONT, size: 20, bold: opts.bold || false, color: opts.color || "333333" })]
    })]
  });
}

function makeBoldCell(text, width, opts = {}) {
  return makeCell(text, width, { ...opts, bold: true });
}

// ── Image Helper Functions ─────────────────────────────────────
function loadImage(filename) {
  if (filename.startsWith("ipts_")) return path.join(ARCH_DIR, filename);
  return path.join(SCREENSHOTS_DIR, filename);
}

function tryImageParagraph(filePath, width, height, title, description) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`  [WARN] Image not found: ${filePath}`);
      return para(`[Image: ${title}]`, { italics: true, color: "999999" });
    }
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80 },
      children: [
        new ImageRun({
          type: "png",
          data: fs.readFileSync(filePath),
          transformation: { width, height },
          altText: { title, description, name: path.basename(filePath, ".png") },
        }),
      ],
    });
  } catch (e) {
    console.warn(`  [WARN] Could not load image ${filePath}: ${e.message}`);
    return para(`[Image: ${title}]`, { italics: true, color: "999999" });
  }
}

function imageCaption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text, font: FONT, size: 18, italics: true, color: "777777" })],
  });
}

function ss(name) { return path.join(SCREENSHOTS_DIR, name); }

// ── Green checkmark paragraph ──────────────────────────────────
function checkPara(text) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: "\u2705  ", font: FONT, size: 22 }),
      new TextRun({ text, font: FONT, size: 22, color: "333333" })
    ]
  });
}

// ═══════════════════════════════════════════════════════════════
// ===== COVER PAGE =====
// ═══════════════════════════════════════════════════════════════
const coverPage = [
  new Paragraph({ spacing: { before: 3000 }, children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [new TextRun({ text: "G9-IPTS", font: FONT, size: 72, bold: true, color: C1 })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: "Integrated Payment Transformation System", font: FONT, size: 28, color: COLOR_DARK })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C2, space: 1 } },
    spacing: { after: 400 },
    children: []
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: "Executive Briefing Report", font: FONT, size: 32, bold: true, color: C1 })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "Senior Leadership & Board-Level Summary", font: FONT, size: 24, italics: true, color: COLOR_DARK })]
  }),
  new Paragraph({ spacing: { before: 400 }, children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: "Prepared by", font: FONT, size: 20, color: "888888" })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [new TextRun({ text: "Mohamad Idriss  |  Rohit Jacob Isaac  |  Sriram Acharya Mudumbai", font: FONT, size: 22, bold: true, color: COLOR_DARK })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "Walid Elmahdy  |  Vibin Chandrabose", font: FONT, size: 22, bold: true, color: COLOR_DARK })]
  }),
  new Paragraph({ spacing: { before: 400 }, children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: "Version 6.0  |  April 2026", font: FONT, size: 24, color: "666666" })]
  }),
  new Paragraph({ spacing: { before: 600 }, children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [new TextRun({ text: "CONFIDENTIAL", font: FONT, size: 20, bold: true, color: "CC0000" })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "For Authorized Recipients Only", font: FONT, size: 18, color: "888888" })]
  }),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== TABLE OF CONTENTS =====
// ═══════════════════════════════════════════════════════════════
const tocSection = [
  heading1("Table of Contents"),
  emptyLine(),
  ...[
    ["1.", "Executive Summary", "3"],
    ["2.", "The Problem: Cross-Border Settlement Today", "5"],
    ["3.", "IPTS 7-Layer Convergent Architecture", "7"],
    ["4.", "System Walkthrough", "13"],
    ["5.", "AI/ML Capabilities & Explainability", "19"],
    ["6.", "Four-Eyes Approval & Operational Controls", "22"],
    ["7.", "Multi-Currency FX Engine", "24"],
    ["8.", "Security & Compliance", "25"],
    ["9.", "ROI Analysis", "27"],
    ["10.", "Total Cost of Ownership (TCO)", "28"],
    ["11.", "Business Impact", "29"],
    ["12.", "Risk Assessment", "31"],
    ["13.", "Implementation Roadmap", "32"],
    ["14.", "Conclusion & Recommendations", "33"],
  ].map(([num, title, pg]) =>
    new Paragraph({
      spacing: { after: 100 },
      tabStops: [{ type: "right", position: CONTENT_WIDTH, leader: "dot" }],
      children: [
        new TextRun({ text: `${num}  ${title}`, font: FONT, size: 22, color: COLOR_DARK }),
        new TextRun({ text: "\t", font: FONT, size: 22 }),
        new TextRun({ text: pg, font: FONT, size: 22, color: "666666" }),
      ]
    })
  ),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 1 - EXECUTIVE SUMMARY =====
// ═══════════════════════════════════════════════════════════════
const section1 = [
  heading1("1. Executive Summary"),
  para("The Integrated Payment Transformation System (IPTS) is an enterprise-grade financial settlement platform that collapses cross-border payment cycles from the traditional T+2 to T+5 window to near-real-time settlement in under 10 seconds. Built on a 7-layer convergent architecture, IPTS integrates blockchain-based atomic settlement, a 5-model AI/ML fraud detection ensemble with SHAP explainability, four-eyes dual approval for high-value transactions, multi-currency FX conversion, Zero Trust security, and GDPR-compliant data sovereignty into a unified platform."),
  emptyLine(),
  para("This briefing provides senior leadership with a comprehensive overview of IPTS capabilities, including the significant enhancements delivered in Version 6.0: 17 new features spanning P2P transfers, ACH/Wire/SEPA payments, scheduled and QR code payments, multi-account management, beneficiary management, real-time ledger, virtual card generation, card controls, digital wallet provisioning, Spending 360 analytics, e-KYC verification, biometric controls, fraud alert monitoring, notification center, AI-powered support chat, and a fully redesigned 12-tab dashboard."),
  emptyLine(),

  heading2("1.1 Key Performance Indicators"),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [3200, 3080, 3080],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("KPI Metric", 3200),
        makeHeaderCell("Before IPTS", 3080),
        makeHeaderCell("After IPTS v4.0", 3080),
      ]}),
      ...[
        ["Settlement Time", "T+2 to T+5 (2-5 business days)", "< 10 seconds (T+0)"],
        ["Fraud Detection Rate", "45-60% (rule-based only)", "98-100% (5-model ensemble)"],
        ["False Positive Rate", "15-25%", "< 3%"],
        ["AI Explainability", "None (black box)", "Full SHAP per transaction"],
        ["Compliance Cost", "$10.2M annually", "$2.55M annually"],
        ["Annual Net Savings", "Baseline", "$7.65M per year"],
        ["Currency Support", "USD only", "13 currencies with FX"],
        ["Approval Controls", "Single approver", "Four-eyes dual approval"],
        ["3-Year ROI", "N/A", "287%"],
      ].map((row, idx) => {
        const shading = idx % 2 === 0 ? COLOR_TABLE_ALT : undefined;
        return new TableRow({ children: [
          makeBoldCell(row[0], 3200, { shading }),
          makeCell(row[1], 3080, { shading }),
          makeBoldCell(row[2], 3080, { shading, color: C2 }),
        ]});
      })
    ]
  }),
  emptyLine(),
  para("The platform addresses a $190 trillion cross-border payments market with a projected payback period of 5 months and cumulative 3-year net benefit of $18.15 million."),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 2 - THE PROBLEM =====
// ═══════════════════════════════════════════════════════════════
const section2 = [
  heading1("2. The Problem: Cross-Border Settlement Today"),
  para("The global cross-border payments market processes approximately $190 trillion annually, yet relies on infrastructure designed decades ago. Financial institutions face compounding challenges that erode margins, increase regulatory exposure, and degrade customer experience."),
  emptyLine(),

  heading2("2.1 Settlement Latency"),
  para("Cross-border payments currently require T+2 to T+5 business days to reach finality. This delay stems from multi-hop correspondent banking chains, time zone mismatches, and batch-processing cycles. For corporates managing global supply chains, this latency traps working capital and creates FX exposure windows that are difficult to hedge cost-effectively."),
  emptyLine(),

  heading2("2.2 Trapped Liquidity"),
  para("An estimated $27 trillion sits locked in Nostro/Vostro accounts globally. Correspondent banks must pre-fund these accounts to facilitate cross-border flows, creating massive opportunity costs. For mid-tier banks, Nostro funding requirements can represent 5-8% of total assets."),
  emptyLine(),

  heading2("2.3 Compliance Overhead"),
  para("Financial institutions spend an average of $10.2 million annually on AML/KYC compliance operations. Manual transaction monitoring generates false positive rates of 15-25%, requiring large compliance teams to triage alerts. Regulatory fines for AML failures have exceeded $36 billion globally since 2008, creating existential risk for non-compliant institutions."),
  emptyLine(),

  heading2("2.4 Explainability Gap"),
  para("A critical emerging challenge is the regulatory demand for algorithmic explainability. As financial institutions adopt AI/ML for fraud detection, regulators including the EU AI Act, FinCEN, and MAS increasingly require that automated risk decisions be transparent and auditable. Legacy ML implementations operate as 'black boxes', making it impossible to explain why a specific transaction was blocked. This creates regulatory risk and undermines trust in automated systems. IPTS addresses this directly with per-transaction SHAP explainability."),
  emptyLine(),

  heading2("2.5 Fragmented Infrastructure"),
  para("The current ecosystem involves multiple intermediaries adding cost ($25-$65 per transaction), latency, and opacity. The absence of a unified platform means reconciliation is manual, error-prone, and resource-intensive."),
  emptyLine(),

  heading2("2.6 Market Opportunity"),
  para("The $190 trillion cross-border payments market is at an inflection point. Institutions that modernize their settlement infrastructure will capture market share, reduce operational costs by 60-75%, and position themselves for the next decade of financial services innovation. IPTS directly addresses each of these pain points."),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 3 - 7-LAYER ARCHITECTURE =====
// ═══════════════════════════════════════════════════════════════
const section3 = [
  heading1("3. IPTS 7-Layer Convergent Architecture"),
  para("IPTS implements a 7-Layer Convergent Architecture where each layer encapsulates a specific domain concern. This separation enables independent scaling, testing, and regulatory auditing while maintaining cohesive end-to-end transaction processing."),
  emptyLine(),

  heading2("3.1 Architecture Overview"),
  tryImageParagraph(loadImage("ipts_seven_layer_convergent_architecture.png"), 580, 700,
    "IPTS Seven-Layer Convergent Architecture",
    "Complete overview of the IPTS 7-layer architecture"
  ),
  imageCaption("Figure 1: IPTS Seven-Layer Convergent Architecture Overview"),
  emptyLine(),

  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [1400, 2200, 5760],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("Layer", 1400),
        makeHeaderCell("Name", 2200),
        makeHeaderCell("Key Capabilities (v4.0)", 5760),
      ]}),
      ...[
        ["Layer 1", "Interaction", "Digital portals, multi-currency payment forms, SHAP charts, SLA tracking, health monitoring"],
        ["Layer 2", "Integration", "ISO 20022 messaging, API gateway, FX engine with 13 currencies, rate limiting"],
        ["Layer 3", "Intelligence", "5-model ML ensemble, 16-feature vector, SHAP explainability, VelocityTracker, NLP sanctions"],
        ["Layer 4", "Security", "Zero Trust JWT auth, RBAC, four-eyes dual approval ($100K+), rate limiting, security headers"],
        ["Layer 5", "Compliance", "HITL triage with SLA countdown, case management, SAR filing, sanctions DB, SWIFT GPI"],
        ["Layer 6", "Distributed Ledger", "7 smart contracts, atomic swaps, Nostro/Vostro, multi-sig approval, compliance oracle"],
        ["Layer 7", "Data & Infrastructure", "Hash anchoring, GDPR PII vault, health monitoring, local macOS + Colab deployment"],
      ].map((row, idx) => {
        const shading = idx % 2 === 0 ? COLOR_TABLE_ALT : undefined;
        return new TableRow({ children: [
          makeBoldCell(row[0], 1400, { shading }),
          makeCell(row[1], 2200, { shading }),
          makeCell(row[2], 5760, { shading }),
        ]});
      })
    ]
  }),
  pageBreak(),

  heading2("3.2 Layer 1 \u2014 Interaction Architecture"),
  para("The Interaction Layer serves as the primary interface with digital portals, wallet integrations, and automated triggers feeding into a unified request pipeline."),
  tryImageParagraph(loadImage("ipts_layer1_interaction_architecture.png"), 500, 300,
    "Interaction Layer", "Layer 1 architecture"
  ),
  imageCaption("Figure 2: Layer 1 \u2014 Interaction Architecture"),
  emptyLine(),

  heading2("3.3 Layer 2 \u2014 Integration Architecture"),
  para("The Integration Layer connects IPTS with the financial ecosystem through an API Gateway with ISO 20022 parsing, format adaptation, and data enrichment via an event bus."),
  tryImageParagraph(loadImage("ipts_layer1_integration_architecture.png"), 500, 330,
    "Integration Layer", "Layer 2 architecture"
  ),
  imageCaption("Figure 3: Layer 2 \u2014 Integration Architecture"),
  emptyLine(),

  heading2("3.4 Layer 3 \u2014 Intelligence Engine"),
  para("The Intelligence Layer houses the 5-model ML ensemble with SHAP explainability. The AML/KYC screening engine applies a weighted composite scoring system: rule-based (30%), ML ensemble (40%), NLP watchlist (15%), and graph analytics (15%). The VelocityTracker provides real-time behavioral features, and force-override triggers automatically block high-risk transactions."),
  emptyLine(),

  heading2("3.5 Layer 4 \u2014 Zero Trust Security"),
  para("Implements Zero Trust with JWT authentication, RBAC, four-eyes dual approval for transactions >= $100K, Continuous Verification, and Threat Intelligence integration."),
  tryImageParagraph(loadImage("ipts_layer2_security_architecture.png"), 500, 320,
    "Security Layer", "Layer 4 architecture"
  ),
  imageCaption("Figure 4: Layer 4 \u2014 Zero Trust Security Architecture"),
  emptyLine(),

  heading2("3.6 Layer 5 \u2014 Compliance & Case Management"),
  para("Provides HITL triage with SLA countdown tracking (Critical 4h, High 24h, Medium 72h, Low 7d), full case management lifecycle, SAR filing workflows, and real-time sanctions screening."),
  emptyLine(),

  heading2("3.7 Layer 6 \u2014 Data Architecture"),
  para("Ensures data integrity with SHA-256 hash anchoring, tamper-evident audit trails, GDPR Compliance Vault with right-to-erasure, and a four_eyes_approvals table for dual-approval tracking."),
  tryImageParagraph(loadImage("ipts_layer6_data_architecture.png"), 500, 320,
    "Data Layer", "Layer 6 architecture"
  ),
  imageCaption("Figure 5: Layer 6 \u2014 Data Architecture"),
  emptyLine(),

  heading2("3.8 Layer 7 \u2014 Infrastructure"),
  para("Runtime foundation with Ganache blockchain, Flask API, health monitoring (/api/health polled every 30s), local macOS deployment via run_local.sh, and Google Colab support."),
  tryImageParagraph(loadImage("ipts_layer7_infrastructure_architecture.png"), 500, 320,
    "Infrastructure Layer", "Layer 7 architecture"
  ),
  imageCaption("Figure 6: Layer 7 \u2014 Infrastructure Architecture"),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 4 - SYSTEM WALKTHROUGH =====
// ═══════════════════════════════════════════════════════════════
const section4 = [
  heading1("4. System Walkthrough"),
  para("The following screenshots demonstrate the fully operational IPTS platform v6.0, captured from the live system running locally on macOS. The platform now features 17 functional tabs, 7 payment channels, virtual card services, spending analytics, E-KYC verification, DeFi hub, proof of reserve, network graph analysis, LLM-powered support, and real-time notifications."),
  emptyLine(),

  heading2("4.1 Dashboard \u2014 Multi-Account, KPIs & Notifications"),
  para("The main dashboard provides KPI cards, multi-account overview (Checking, Savings, Business), a real-time ledger panel, live FX rates ticker, settlement volume chart, AML telemetry, and a notification bell with badge count polled via SSE."),
  tryImageParagraph(ss("Dashboard_MultiAccount.png"), 580, 310,
    "Dashboard", "Dashboard with multi-account cards, KPIs, and notification bell"
  ),
  imageCaption("Figure 7: Dashboard \u2014 Multi-Account Cards, KPIs, and Notification Bell"),
  emptyLine(),

  heading2("4.2 Dashboard \u2014 Real-Time Ledger & Notifications"),
  para("The real-time ledger shows the latest transactions with direction (debit/credit), counterparty, status, and balance. The notification center provides a dropdown panel with unread alerts for settlements, P2P transfers, card generation, and KYC verification events."),
  tryImageParagraph(ss("Dashboard_Ledger.png"), 580, 310,
    "Ledger", "Real-time ledger panel"
  ),
  imageCaption("Figure 8: Dashboard \u2014 Real-Time Ledger and Transaction History"),
  emptyLine(),

  heading2("4.3 Payment Hub \u2014 5 Payment Channels"),
  para("The Payments tab now features 5 sub-tabs: Settlement (multi-currency with SHAP), P2P Transfer (by username/email/phone), ACH/Wire/SEPA (external bank transfers with fee calculation), Scheduled Payments (recurring daily/weekly/bi-weekly/monthly), and QR Pay (generate/scan QR codes)."),
  tryImageParagraph(ss("Payment_Settlement.png"), 580, 310,
    "Payment Settlement", "Payment settlement with FX preview"
  ),
  imageCaption("Figure 9: Payments \u2014 Settlement with FX Preview and SHAP Contributions"),
  emptyLine(),

  tryImageParagraph(ss("Payment_P2P.png"), 280, 180,
    "P2P Transfer", "P2P transfer form"
  ),
  tryImageParagraph(ss("Payment_ACH_Wire_SEPA.png"), 280, 180,
    "ACH/Wire/SEPA", "External bank transfer"
  ),
  imageCaption("Figure 10: P2P Transfer (left) and ACH/Wire/SEPA External Transfer (right)"),
  emptyLine(),

  tryImageParagraph(ss("Payment_Scheduled.png"), 280, 180,
    "Scheduled Payments", "Scheduled payment form"
  ),
  tryImageParagraph(ss("Payment_QR_Pay.png"), 280, 180,
    "QR Pay", "QR code payment"
  ),
  imageCaption("Figure 11: Scheduled Payments (left) and QR Pay (right)"),
  pageBreak(),

  heading2("4.4 Beneficiary Management"),
  para("A dedicated Beneficiaries tab enables account owners to add, edit, and manage beneficiaries with full details including account numbers, SWIFT codes, bank names, countries, currencies, and risk levels. Added beneficiaries automatically appear in the Settlement payment dropdown."),
  tryImageParagraph(ss("Beneficiaries_Tab.png"), 580, 310,
    "Beneficiaries", "Beneficiary management tab"
  ),
  imageCaption("Figure 12: Beneficiary Management \u2014 Add, Edit, Delete with Risk Levels"),
  emptyLine(),

  heading2("4.5 Spending 360 Analytics"),
  para("The Spending 360 dashboard provides comprehensive analytics including KPI cards (Total Sent, Total Received, Avg Risk Score, Highest Transaction, Account Balance), monthly spending trend charts, risk distribution, currency breakdown, activity by hour, and top beneficiary rankings."),
  tryImageParagraph(ss("Spending_360_Overview.png"), 580, 310,
    "Spending 360", "Spending 360 analytics dashboard"
  ),
  imageCaption("Figure 13: Spending 360 \u2014 KPI Cards and Monthly Spending Trend"),
  emptyLine(),

  tryImageParagraph(ss("Spending_360_Charts.png"), 580, 310,
    "Spending Charts", "Spending analytics charts"
  ),
  imageCaption("Figure 14: Spending 360 \u2014 Currency Breakdown and Activity Heatmap"),
  emptyLine(),

  heading2("4.6 Virtual Card Services"),
  para("The Cards tab enables generation of Visa and Mastercard virtual cards with masked numbers, gradient styling, and spending controls. Cards can be frozen/unfrozen, provisioned to Apple Pay/Google Pay/Samsung Pay, or permanently cancelled."),
  tryImageParagraph(ss("Cards_Tab.png"), 580, 310,
    "Virtual Cards", "Virtual card gallery"
  ),
  imageCaption("Figure 15: Virtual Cards \u2014 Generate, Freeze, Provision to Digital Wallets"),
  pageBreak(),

  heading2("4.7 Security \u2014 E-KYC & Fraud Monitoring"),
  para("The Security tab features a 3-phase E-KYC verification flow (document upload, AI processing, identity verified with confidence score), biometric control toggles (Face ID, fingerprint), and a real-time fraud alert feed with severity levels and acknowledgment controls."),
  tryImageParagraph(ss("Security_KYC.png"), 580, 310,
    "E-KYC", "E-KYC verification flow"
  ),
  imageCaption("Figure 16: Security \u2014 E-KYC Verification and Biometric Controls"),
  emptyLine(),

  heading2("4.8 Documents & Support"),
  para("The Documents tab provides auto-generated monthly statements with download capabilities. A floating AI-powered Support Chat widget (bottom-right) responds to account, payment, security, and card queries. The Notification Center provides real-time SSE-powered alerts with mark-as-read functionality."),
  tryImageParagraph(ss("Documents_Tab.png"), 280, 180,
    "Documents", "Document center"
  ),
  tryImageParagraph(ss("Support_Chat.png"), 280, 180,
    "Support Chat", "AI support chat bot"
  ),
  imageCaption("Figure 17: Documents Center (left) and AI Support Chat (right)"),
  pageBreak(),

  heading2("4.9 DeFi Hub — AMM Swap, Staking & HTLC Escrow"),
  para("The DeFi Hub introduces decentralized finance capabilities directly into the IPTS platform. Users can perform automated market maker (AMM) token swaps, stake assets for yield with configurable lock periods, and create Hash Time-Locked Contract (HTLC) escrow agreements for trustless cross-party settlements."),
  tryImageParagraph(ss("DeFi_Swap.png"), 280, 180,
    "DeFi Swap", "AMM swap interface"
  ),
  imageCaption("Figure 18: DeFi Hub — AMM Swap Interface"),
  tryImageParagraph(ss("DeFi_Staking.png"), 280, 180,
    "DeFi Staking", "Staking dashboard"
  ),
  imageCaption("Figure 19: DeFi Hub — Staking Dashboard"),
  tryImageParagraph(ss("DeFi_Escrow.png"), 280, 180,
    "DeFi Escrow", "HTLC escrow interface"
  ),
  imageCaption("Figure 20: DeFi Hub — HTLC Escrow"),
  emptyLine(),

  heading2("4.10 Global Fraud Heatmap"),
  para("The Global Fraud Heatmap provides a geographic visualization of fraud activity across all monitored jurisdictions. Risk hotspots are color-coded by severity, enabling compliance teams to identify emerging threat corridors and adjust AML policies in real time."),
  tryImageParagraph(ss("Fraud_Heatmap.png"), 280, 180,
    "Fraud Heatmap", "Global fraud heatmap visualization"
  ),
  imageCaption("Figure 21: Global Fraud Heatmap"),
  emptyLine(),

  heading2("4.11 Proof of Reserve"),
  para("The Proof of Reserve dashboard provides cryptographic verification of on-chain reserves against issued liabilities, ensuring full transparency and solvency attestation for all digital asset holdings on the platform."),
  tryImageParagraph(ss("Dashboard_ProofOfReserve.png"), 280, 180,
    "Proof of Reserve", "Proof of reserve dashboard"
  ),
  imageCaption("Figure 22: Proof of Reserve Dashboard"),
  emptyLine(),

  heading2("4.12 AI Support Chat with LLM"),
  para("The AI Support Chat has been upgraded with a large language model (LLM) backend, enabling natural language understanding for complex account, payment, compliance, and DeFi queries. The LLM provides context-aware responses with citation of relevant platform documentation and regulatory guidance."),
  tryImageParagraph(ss("Support_Chat.png"), 280, 180,
    "AI Support Chat LLM", "LLM-powered support chat"
  ),
  imageCaption("Figure 23: AI Support Chat with LLM Integration"),
  emptyLine(),

  heading2("4.13 Network Graph Analysis"),
  para("The Network Graph Analysis view provides dual-mode visualization of transaction relationships. The full graph displays all entities and edges, while the connected-component view isolates clusters for targeted fraud investigation and AML pattern detection."),
  tryImageParagraph(ss("Network_Graph_Full.png"), 280, 180,
    "Network Graph Full", "Full network graph view"
  ),
  imageCaption("Figure 24: Network Graph — Full View"),
  tryImageParagraph(ss("Network_Graph_Connected.png"), 280, 180,
    "Network Graph Connected", "Connected component view"
  ),
  imageCaption("Figure 25: Network Graph — Connected Components"),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 5 - AI/ML CAPABILITIES =====
// ═══════════════════════════════════════════════════════════════
const section5 = [
  heading1("5. AI/ML Capabilities & Explainability"),
  para("IPTS v6.0 deploys a 5-model machine learning ensemble trained on 15,000 synthetic transactions using a 16-dimensional feature vector that includes 8 real-time velocity features computed by the VelocityTracker. This represents a significant upgrade from the previous 4-model, 8-feature architecture."),
  emptyLine(),

  heading2("5.1 Five-Model Ensemble"),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [1800, 1500, 2200, 1800, 2060],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("Model", 1800),
        makeHeaderCell("Type", 1500),
        makeHeaderCell("Configuration", 2200),
        makeHeaderCell("F1 Score", 1800),
        makeHeaderCell("Role in Ensemble", 2060),
      ]}),
      ...[
        ["Isolation Forest", "Unsupervised", "100 est., 3% contamination", "92.8%", "Anomaly detection"],
        ["Random Forest", "Supervised", "200 est., SMOTE", "97.3%", "Classification + SHAP fallback"],
        ["XGBoost", "Supervised", "300 est., class-weighted", "96.8%", "Primary classifier + SHAP source"],
        ["Autoencoder", "Semi-supervised", "64-32-16-32-64 MLP", "93.5%", "Reconstruction anomaly"],
        ["Sequence Detector", "Pattern-based", "Sliding window, velocity", "96.3%", "Temporal pattern detection"],
      ].map((row, idx) => {
        const shading = idx % 2 === 0 ? COLOR_TABLE_ALT : undefined;
        return new TableRow({ children: [
          makeBoldCell(row[0], 1800, { shading }),
          makeCell(row[1], 1500, { shading }),
          makeCell(row[2], 2200, { shading }),
          makeBoldCell(row[3], 1800, { shading, color: C2 }),
          makeCell(row[4], 2060, { shading }),
        ]});
      })
    ]
  }),
  emptyLine(),

  heading2("5.2 16-Feature Vector with Velocity Tracking"),
  para("Each transaction is scored using 16 features: 8 static transaction attributes (amount, hour, day, frequency, round number flag, country risk, sender/receiver IDs) and 8 real-time behavioral features computed by the VelocityTracker (velocity at 1h/24h/7d windows, average amount, standard deviation, z-score, unique receivers, new receiver flag). This dual-source approach enables detection of both per-transaction anomalies and behavioral pattern shifts."),
  emptyLine(),

  heading2("5.3 SHAP Explainability"),
  para("Every risk decision in IPTS v6.0 is fully explainable. The system uses SHAP (SHapley Additive exPlanations) to decompose each risk score into per-feature contributions:"),
  emptyLine(),
  bulletBold("TreeExplainer: ", "Uses XGBoost's tree structure to compute exact Shapley values in polynomial time. Each feature receives a signed contribution score indicating its positive (risk-increasing) or negative (risk-decreasing) impact."),
  bulletBold("RF Fallback: ", "If TreeExplainer fails, Random Forest feature_importances_ are multiplied by per-feature deviations from population means to produce approximate contribution scores."),
  bulletBold("Frontend Integration: ", "SHAP values are displayed inline in settlement results and as horizontal bar charts in the AI/ML tab. Compliance officers can review the AI reasoning behind every blocked transaction."),
  bulletBold("API Response: ", "The settlement API returns shap_values as a JSON dictionary with all 16 feature names mapped to their contribution scores."),
  emptyLine(),
  para("This level of explainability satisfies emerging regulatory requirements under the EU AI Act, FinCEN's guidelines on algorithmic decision-making, and MAS's FEAT principles for responsible AI in financial services."),
  emptyLine(),

  heading2("5.4 Graph Analytics"),
  para("NetworkX-based graph analysis provides PageRank centrality computation, label propagation community detection, and targeted cycle detection on the fraud subgraph to identify potential laundering rings. These graph-derived signals contribute 15% of the composite risk score."),
  emptyLine(),

  heading2("5.5 Global Fraud Heatmap"),
  para("A geographic fraud heatmap aggregates risk scores by jurisdiction and renders real-time hotspot visualization. The heatmap feeds from the ensemble model outputs and graph analytics to surface emerging threat corridors, enabling proactive AML policy adjustments."),
  emptyLine(),

  heading2("5.6 Model Caching"),
  para("Trained model artifacts are cached using joblib serialization with SHA-256 integrity verification. On startup, IPTS loads cached models in under 2 seconds, eliminating cold-start latency. Cache invalidation triggers automatically when retraining completes or when feature vector schema changes are detected."),
  emptyLine(),

  heading2("5.7 Continuous Learning"),
  para("Authorized users (Admin and Data Scientist roles) can trigger on-demand model retraining, which regenerates synthetic data, retrains all five models on the 16-feature vector, recomputes graph analytics, and updates feature importance rankings without platform downtime."),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 6 - FOUR-EYES & OPERATIONAL CONTROLS =====
// ═══════════════════════════════════════════════════════════════
const section6 = [
  heading1("6. Four-Eyes Approval & Operational Controls"),
  para("IPTS v6.0 introduces a four-eyes dual approval mechanism that enforces segregation of duties for high-value transaction approvals, addressing a critical regulatory requirement for financial institutions."),
  emptyLine(),

  heading2("6.1 Four-Eyes Mechanism"),
  para("Any blocked transaction with an amount >= $100,000 requires approval from two independent compliance officers:"),
  emptyLine(),
  boldPara("Step 1 \u2014 First Approval: ", "A compliance officer reviews the transaction in the HITL queue and clicks Approve. The system records this as the first approval and updates the status to 'awaiting_second_approval'."),
  boldPara("Step 2 \u2014 Enforcement: ", "The system prevents the same user from providing the second approval. An alert dialog informs the first approver that a different officer must confirm."),
  boldPara("Step 3 \u2014 Second Approval: ", "A different compliance officer reviews and approves. The transaction is then released for blockchain settlement."),
  emptyLine(),
  para("The HITL queue displays three-state badges: 'Required' (orange, no approvals yet), '1 of 2' (yellow, first approval recorded), and '2 of 2' (green, fully approved). All approval actions are logged to the audit trail with officer identity, timestamp, and the four-eyes approval record."),
  emptyLine(),

  heading2("6.2 SLA Tracking"),
  para("Compliance cases are assigned SLA windows based on severity:"),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [2340, 2340, 4680],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("Severity", 2340),
        makeHeaderCell("SLA Window", 2340),
        makeHeaderCell("Use Case", 4680),
      ]}),
      ...[
        ["CRITICAL", "4 hours", "Sanctions matches, terrorist financing alerts"],
        ["HIGH", "24 hours", "High-value blocked transactions, structuring"],
        ["MEDIUM", "72 hours", "AML-flagged transactions, jurisdiction risk"],
        ["LOW", "168 hours (7 days)", "Routine review, informational alerts"],
      ].map((row, idx) => {
        const shading = idx % 2 === 0 ? COLOR_TABLE_ALT : undefined;
        const sevColor = idx === 0 ? "CC0000" : idx === 1 ? "E67E00" : idx === 2 ? "B8860B" : "0E8C5F";
        return new TableRow({ children: [
          makeBoldCell(row[0], 2340, { shading, color: sevColor }),
          makeBoldCell(row[1], 2340, { shading }),
          makeCell(row[2], 4680, { shading }),
        ]});
      })
    ]
  }),
  emptyLine(),
  para("The frontend displays countdown badges in the Case Management tab. Cases approaching SLA breach are highlighted in red to ensure timely resolution."),
  emptyLine(),

  heading2("6.3 Health Monitoring"),
  para("The /api/health endpoint reports the status of all critical components (Flask API, Ganache blockchain, ML models, database). The frontend polls this every 30 seconds and displays a colored status dot: green (all systems healthy), yellow (degraded), red (offline). This provides continuous operational awareness without manual checks."),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 7 - FX ENGINE =====
// ═══════════════════════════════════════════════════════════════
const section7fx = [
  heading1("7. Multi-Currency FX Engine"),
  para("IPTS v4.0 supports real-time foreign exchange conversion across 13 currencies, enabling true multi-currency cross-border settlements."),
  emptyLine(),

  heading2("7.1 Capabilities"),
  bullet("Live exchange rates via /api/fx/rates endpoint with rates relative to USD"),
  bullet("Payment form currency selector with automatic FX preview showing USD equivalent"),
  bullet("AML jurisdiction warnings for high-risk currencies (BRL, CNY, INR, AED, SAR)"),
  bullet("Standalone FX converter tool in the Compliance tab for ad-hoc conversions"),
  bullet("All settlements are ultimately denominated in USD for blockchain recording"),
  emptyLine(),

  heading2("7.2 Supported Currencies"),
  para("The FX engine supports: USD, EUR, GBP, JPY, CHF, AUD, CAD, CNY, INR, SGD, AED, SAR, and BRL. Currencies from elevated-risk jurisdictions (CNY, INR, BRL, AED, SAR) trigger automatic AML warning banners in the payment form, alerting the operator to enhanced due diligence requirements."),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 8 - SECURITY & COMPLIANCE =====
// ═══════════════════════════════════════════════════════════════
const section8sec = [
  heading1("8. Security & Compliance"),
  para("IPTS implements defense-in-depth security across all layers, combining Zero Trust access control, four-eyes approval, GDPR-compliant data sovereignty, and comprehensive regulatory mapping."),
  emptyLine(),

  heading2("8.1 Zero Trust Architecture"),
  bulletBold("JWT Authentication: ", "HS256 tokens with 1-hour expiry, validated via @zero_trust_required decorator on every endpoint."),
  bulletBold("RBAC: ", "5 roles (Admin, Operator, Auditor, Compliance, Data Scientist) with granular 11-feature permission matrix."),
  bulletBold("Four-Eyes: ", "Dual approval for transactions >= $100K with same-user enforcement."),
  bulletBold("Rate Limiting: ", "100 requests per minute per IP."),
  bulletBold("Security Headers: ", "HSTS, X-Frame-Options: DENY, X-XSS-Protection, X-Content-Type-Options: nosniff."),
  emptyLine(),

  heading2("8.2 GDPR Dual-Storage"),
  para("On-chain blockchain ledger stores settlement records with SHA-256 hash anchors. Off-chain SQLite vault stores encrypted PII with consent tracking. Right-to-erasure API anonymizes PII while preserving on-chain hash integrity."),
  emptyLine(),

  heading2("8.3 Regulatory Mapping"),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [1800, 3800, 3760],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("Regulation", 1800),
        makeHeaderCell("Requirement", 3800),
        makeHeaderCell("IPTS Implementation", 3760),
      ]}),
      ...[
        ["FATF Travel Rule", "Originator/beneficiary info on transfers > $1,000", "ISO 20022 payload with full counterparty data anchored on-chain"],
        ["EU AI Act", "Algorithmic explainability for high-risk AI systems", "Per-transaction SHAP values with 16-feature decomposition"],
        ["6AMLD (EU)", "Enhanced due diligence, predicate offence coverage", "5-model ML ensemble + NLP + graph analytics for risk scoring"],
        ["GDPR", "Data minimization, right to erasure, consent management", "Off-chain PII vault with hash anchoring, erasure API, consent tracking"],
        ["FinCEN BSA", "SAR filing, CTR reporting, AML program requirements", "Automated SAR filing, $100K auto-block, case management, four-eyes"],
        ["PCI DSS", "Secure data, access controls, monitoring", "AES-256 at rest, TLS 1.3 in transit, audit logging, RBAC, health monitoring"],
      ].map((row, idx) => {
        const shading = idx % 2 === 0 ? COLOR_TABLE_ALT : undefined;
        return new TableRow({ children: [
          makeBoldCell(row[0], 1800, { shading }),
          makeCell(row[1], 3800, { shading }),
          makeCell(row[2], 3760, { shading }),
        ]});
      })
    ]
  }),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 9 - ROI ANALYSIS =====
// ═══════════════════════════════════════════════════════════════
const section9 = [
  heading1("9. ROI Analysis"),
  para("The financial case for IPTS is built on quantifiable cost reductions across compliance operations, settlement processing, fraud losses, and trapped liquidity."),
  emptyLine(),

  heading2("9.1 Annual Cost Comparison"),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [3500, 2930, 2930],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("Cost Category", 3500),
        makeHeaderCell("Current ($M)", 2930),
        makeHeaderCell("With IPTS ($M)", 2930),
      ]}),
      ...[
        ["Compliance Operations", "$4.50M", "$1.10M"],
        ["Settlement Processing", "$2.20M", "$0.55M"],
        ["Fraud Losses", "$1.80M", "$0.40M"],
        ["Trapped Liquidity Cost", "$1.20M", "$0.30M"],
        ["Regulatory Fines (Avg)", "$0.50M", "$0.20M"],
      ].map((row, idx) => {
        const shading = idx % 2 === 0 ? COLOR_TABLE_ALT : undefined;
        return new TableRow({ children: [
          makeBoldCell(row[0], 3500, { shading }),
          makeCell(row[1], 2930, { shading }),
          makeBoldCell(row[2], 2930, { shading, color: C2 }),
        ]});
      }),
      new TableRow({ children: [
        makeBoldCell("TOTAL ANNUAL COST", 3500, { color: C1 }),
        makeBoldCell("$10.20M", 2930, { color: "CC0000" }),
        makeBoldCell("$2.55M", 2930, { color: C2 }),
      ]}),
    ]
  }),
  emptyLine(),
  boldPara("Annual Savings: ", "$7.65M (75% reduction in operational costs)"),
  emptyLine(),

  heading2("9.2 3-Year ROI Projection"),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [2340, 2340, 2340, 2340],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("Metric", 2340),
        makeHeaderCell("Year 1", 2340),
        makeHeaderCell("Year 2", 2340),
        makeHeaderCell("Year 3", 2340),
      ]}),
      ...[
        ["Cumulative Investment", "$3.20M", "$4.00M", "$4.80M"],
        ["Cumulative Savings", "$7.65M", "$15.30M", "$22.95M"],
        ["Cumulative Net Benefit", "$4.45M", "$11.30M", "$18.15M"],
        ["ROI", "+139%", "+238%", "+287%"],
      ].map((row, idx) => {
        const shading = idx % 2 === 0 ? COLOR_TABLE_ALT : undefined;
        return new TableRow({ children: [
          makeBoldCell(row[0], 2340, { shading }),
          ...row.slice(1).map(v => {
            const isGreen = v.startsWith("$") && idx >= 1 || v.startsWith("+");
            return makeBoldCell(v, 2340, { shading, color: isGreen ? C2 : "333333" });
          })
        ]});
      })
    ]
  }),
  emptyLine(),
  boldPara("Payback Period: ", "5 months from initial deployment."),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 10 - TCO =====
// ═══════════════════════════════════════════════════════════════
const section10 = [
  heading1("10. Total Cost of Ownership (TCO)"),
  para("The TCO model captures all costs over a 3-year horizon."),
  emptyLine(),

  heading2("10.1 Year 1 Investment"),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [4680, 2340, 2340],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("Cost Component", 4680),
        makeHeaderCell("Amount", 2340),
        makeHeaderCell("% of Total", 2340),
      ]}),
      ...[
        ["Platform Development", "$1,200,000", "37.5%"],
        ["AI/ML Development & Training", "$400,000", "12.5%"],
        ["Blockchain Infrastructure", "$350,000", "10.9%"],
        ["Security & Compliance Tooling", "$250,000", "7.8%"],
        ["Cloud Infrastructure & Hosting", "$480,000", "15.0%"],
        ["Integration & Testing", "$320,000", "10.0%"],
        ["Training & Change Management", "$200,000", "6.3%"],
      ].map((row, idx) => {
        const shading = idx % 2 === 0 ? COLOR_TABLE_ALT : undefined;
        return new TableRow({ children: [
          makeBoldCell(row[0], 4680, { shading }),
          makeCell(row[1], 2340, { shading }),
          makeCell(row[2], 2340, { shading }),
        ]});
      }),
      new TableRow({ children: [
        makeBoldCell("YEAR 1 TOTAL", 4680, { color: C1 }),
        makeBoldCell("$3,200,000", 2340, { color: C1 }),
        makeBoldCell("100%", 2340, { color: C1 }),
      ]}),
    ]
  }),
  emptyLine(),

  heading2("10.2 3-Year Summary"),
  bulletBold("Year 1: ", "$3,200,000 (initial development + infrastructure)"),
  bulletBold("Year 2: ", "$800,000 (operations + maintenance)"),
  bulletBold("Year 3: ", "$800,000 (operations + maintenance)"),
  bulletBold("3-Year Total TCO: ", "$4,800,000"),
  bulletBold("3-Year Total Savings: ", "$22,950,000"),
  bulletBold("3-Year Net Benefit: ", "$18,150,000 (3.78x return on investment)"),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 11 - BUSINESS IMPACT =====
// ═══════════════════════════════════════════════════════════════
const section11 = [
  heading1("11. Business Impact"),
  emptyLine(),

  heading2("11.1 Operational Metrics"),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [2800, 2200, 2200, 2160],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("KPI", 2800),
        makeHeaderCell("Before", 2200),
        makeHeaderCell("After", 2200),
        makeHeaderCell("Improvement", 2160),
      ]}),
      ...[
        ["Settlement Time", "T+2 to T+5", "< 10 seconds", "99.9%"],
        ["Fraud Detection", "45-60%", "98-100%", "+53-55%"],
        ["False Positives", "15-25%", "< 3%", "-88%"],
        ["AI Explainability", "None", "Full SHAP", "100%"],
        ["Compliance Cost", "$10.2M/yr", "$2.55M/yr", "-75%"],
        ["Currency Support", "1 (USD)", "13 currencies", "+1200%"],
        ["Approval Controls", "Single", "Four-eyes", "Dual"],
        ["Payment Channels", "1 (Settlement)", "7 channels", "+600%"],
        ["Card Services", "None", "Virtual cards", "New"],
        ["Identity (KYC)", "Manual", "E-KYC automated", "New"],
        ["UI Tabs/Features", "7 tabs", "12 tabs", "+71%"],
        ["Audit Trail", "Partial", "100% automated", "100%"],
        ["Liquidity Pools", "None", "AMM DeFi pools", "New"],
        ["Staking APY", "None", "Configurable yield", "New"],
        ["Escrow (HTLC)", "None", "Trustless escrow", "New"],
        ["LLM Chat", "None", "AI support (LLM)", "New"],
      ].map((row, idx) => {
        const shading = idx % 2 === 0 ? COLOR_TABLE_ALT : undefined;
        return new TableRow({ children: [
          makeBoldCell(row[0], 2800, { shading }),
          makeCell(row[1], 2200, { shading }),
          makeBoldCell(row[2], 2200, { shading, color: C2 }),
          makeBoldCell(row[3], 2160, { shading, color: C2 }),
        ]});
      })
    ]
  }),
  emptyLine(),

  heading2("11.2 Strategic Outcomes"),
  heading3("Regulatory Confidence"),
  para("SHAP explainability satisfies EU AI Act requirements and FinCEN guidelines. Four-eyes approval demonstrates segregation of duties. SLA tracking proves timely case resolution. These capabilities position the organization favorably with regulators and reduce examination findings."),
  emptyLine(),
  heading3("Customer Experience"),
  para("Near-real-time settlement, multi-currency support, and transparent risk scoring build trust with corporate clients. The 13-currency FX engine enables true international service without manual currency conversion."),
  emptyLine(),
  heading3("Revenue Growth (12-18%)"),
  para("Faster settlement, multi-currency support, and AI-driven risk management attract premium clients. The platform's competitive pricing enabled by automation creates a 12-18% revenue growth opportunity within 24 months."),
  emptyLine(),
  heading3("Risk Reduction"),
  para("The 5-model ensemble reduces fraud losses by 78%. Four-eyes approval prevents single-point-of-failure in approvals. Blockchain immutability provides irrefutable settlement records. GDPR dual-storage eliminates data sovereignty risk."),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 12 - RISK ASSESSMENT =====
// ═══════════════════════════════════════════════════════════════
const section12 = [
  heading1("12. Risk Assessment"),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [2000, 1100, 1100, 5160],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("Risk", 2000),
        makeHeaderCell("Likelihood", 1100),
        makeHeaderCell("Impact", 1100),
        makeHeaderCell("Mitigation Strategy", 5160),
      ]}),
      ...[
        ["Regulatory Change", "Medium", "High", "Modular compliance layer, SHAP for AI Act compliance, regulatory mapping covers FATF, 6AMLD, GDPR, FinCEN, EU AI Act"],
        ["Integration Complexity", "Medium", "Medium", "Phased implementation, API Gateway with ISO 20022, event bus architecture, local + cloud deployment options"],
        ["Model Drift", "Medium", "Medium", "On-demand retraining, 5-model ensemble redundancy, 16-feature vector with velocity tracking, continuous F1 monitoring"],
        ["Blockchain Performance", "Low", "Medium", "Layer 2 scaling planned, off-chain PII storage, smart contract optimization, 7-contract modular architecture"],
        ["Talent & Expertise", "Medium", "Low", "$200K training budget, operational simplicity by design, comprehensive documentation"],
      ].map((row, idx) => {
        const shading = idx % 2 === 0 ? COLOR_TABLE_ALT : undefined;
        const lColor = row[1] === "Low" ? "0E8C5F" : "E67E00";
        const iColor = row[2] === "High" ? "CC0000" : row[2] === "Low" ? "0E8C5F" : "E67E00";
        return new TableRow({ children: [
          makeBoldCell(row[0], 2000, { shading }),
          makeBoldCell(row[1], 1100, { shading, color: lColor }),
          makeBoldCell(row[2], 1100, { shading, color: iColor }),
          makeCell(row[3], 5160, { shading }),
        ]});
      })
    ]
  }),
  emptyLine(),
  para("Overall risk posture: Moderate with effective mitigation. The phased implementation approach allows progressive risk reduction through gate-based validation."),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 13 - IMPLEMENTATION ROADMAP =====
// ═══════════════════════════════════════════════════════════════
const section13 = [
  heading1("13. Implementation Roadmap"),
  para("6-phase, 12-month roadmap with defined gate criteria at each phase boundary."),
  emptyLine(),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [1600, 1300, 1300, 2800, 2360],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("Phase", 1600),
        makeHeaderCell("Duration", 1300),
        makeHeaderCell("Timeline", 1300),
        makeHeaderCell("Deliverables", 2800),
        makeHeaderCell("Gate Criteria", 2360),
      ]}),
      ...[
        ["1. Foundation", "2 months", "M1-M2", "Core platform, 7 smart contracts, database schema, API framework", "Contracts deployed, APIs functional"],
        ["2. Intelligence", "2 months", "M3-M4", "5-model ML ensemble, 16-feature vector, SHAP, VelocityTracker, graph analytics", "F1 > 95%, SHAP validated, velocity working"],
        ["3. Integration", "2 months", "M5-M6", "ISO 20022, SWIFT GPI, case management, HITL, four-eyes, FX engine", "E2E settlement tested, four-eyes validated"],
        ["4. Security", "2 months", "M7-M8", "Zero Trust, GDPR vault, RBAC, SLA tracking, health monitoring, pen testing", "Security audit passed, GDPR compliant"],
        ["5. Pilot", "2 months", "M9-M10", "Controlled production pilot, multi-currency corridors, performance tuning", "Pilot KPIs met, UAT > 90%"],
        ["6. Scale", "2 months", "M11-M12", "Full production rollout, all 13 currencies, monitoring, training", "Production SLA met, all corridors live"],
      ].map((row, idx) => {
        const shading = idx % 2 === 0 ? COLOR_TABLE_ALT : undefined;
        return new TableRow({ children: row.map((cell, ci) => {
          const w = [1600, 1300, 1300, 2800, 2360][ci];
          return ci === 0 ? makeBoldCell(cell, w, { shading }) : makeCell(cell, w, { shading });
        })});
      })
    ]
  }),
  emptyLine(),
  boldPara("Total Timeline: ", "12 months. Team Size: 8-12 engineers."),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 14 - CONCLUSION =====
// ═══════════════════════════════════════════════════════════════
const section14 = [
  heading1("14. Conclusion & Recommendations"),
  para("IPTS v6.0 represents a transformational platform that addresses the fundamental challenges of cross-border settlement through blockchain, explainable AI, enterprise-grade operational controls, and a comprehensive digital banking experience including multi-channel payments, virtual card services, spending analytics, E-KYC verification, DeFi capabilities (AMM swap, staking, HTLC escrow), LLM-powered support, and advanced network graph analytics."),
  emptyLine(),

  heading2("14.1 Key Takeaways"),
  emptyLine(),
  checkPara("Settlement cycles reduced from T+2-T+5 to under 10 seconds with blockchain finality via 7 smart contracts."),
  checkPara("5-model AI/ML ensemble with 16-feature vector and real-time velocity tracking achieves 98-100% fraud detection with < 3% false positives."),
  checkPara("Full SHAP explainability on every transaction satisfies EU AI Act and FinCEN algorithmic accountability requirements."),
  checkPara("Four-eyes dual approval for transactions >= $100K ensures segregation of duties and regulatory compliance."),
  checkPara("Multi-currency FX engine supporting 13 currencies with AML jurisdiction warnings enables true international settlement."),
  checkPara("SLA tracking with severity-based countdown (4h to 7d) ensures timely compliance case resolution."),
  checkPara("Health monitoring with 30-second polling provides continuous operational awareness."),
  checkPara("7 payment channels (Settlement, P2P, ACH/Wire/SEPA, Scheduled, QR Pay, DeFi Swap, HTLC Escrow) cover all enterprise payment needs."),
  checkPara("Virtual card services with instant issuance, freeze/unfreeze, and spending limits enhance corporate card management."),
  checkPara("Spending 360 analytics with category breakdowns, trend charts, and exportable reports drive financial insights."),
  checkPara("E-KYC identity verification with biometric controls and fraud alert monitoring strengthen compliance posture."),
  checkPara("Beneficiary management with SWIFT/IBAN validation and favorite marking streamlines recurring payments."),
  checkPara("Real-time notification center with SSE-powered alerts and AI support chat improve user experience."),
  checkPara("DeFi Hub with AMM swap, staking yield, and HTLC escrow extends the platform into decentralized finance."),
  checkPara("Global fraud heatmap provides geographic risk visualization for proactive AML policy management."),
  checkPara("Proof of Reserve dashboard delivers cryptographic solvency attestation for digital asset holdings."),
  checkPara("LLM-powered AI Support Chat enables natural language queries across account, payment, and compliance domains."),
  checkPara("Network Graph Analysis with dual-view visualization strengthens fraud investigation and pattern detection."),
  checkPara("3-year ROI of 287% with 5-month payback period, delivering $18.15M cumulative net benefit."),
  emptyLine(),

  heading2("14.2 Recommendations"),
  boldPara("1. Approve Phase 1 Funding: ", "Authorize $3.2M Year 1 investment. The 5-month payback period ensures rapid return."),
  emptyLine(),
  boldPara("2. Establish Governance Committee: ", "Cross-functional steering committee for gate reviews and strategic alignment."),
  emptyLine(),
  boldPara("3. Initiate Regulatory Engagement: ", "Socialize SHAP explainability and four-eyes controls with regulators to secure sandbox participation."),
  emptyLine(),
  boldPara("4. Secure Pilot Corridor Partners: ", "Identify 2-3 correspondent banking partners for multi-currency pilot corridors."),
  emptyLine(),
  boldPara("5. Invest in Talent Development: ", "Allocate $200K Year 1 training budget for blockchain, AI/ML, and Zero Trust upskilling."),

  emptyLine(),
  emptyLine(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: C2, space: 8 } },
    spacing: { before: 400 },
    children: [new TextRun({ text: "End of Executive Briefing", font: FONT, size: 20, italics: true, color: "888888" })]
  }),
];

// ═══════════════════════════════════════════════════════════════
// ===== ASSEMBLE DOCUMENT =====
// ═══════════════════════════════════════════════════════════════
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 22 }
      }
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: C1 },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: COLOR_DARK },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 }
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: FONT, color: COLOR_DARK },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 }
      },
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ]
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 4 } },
          children: [
            new TextRun({ text: "G9-IPTS Executive Briefing v6.0", font: FONT, size: 16, color: "999999", italics: true }),
            new TextRun({ text: "  |  ", font: FONT, size: 16, color: "CCCCCC" }),
            new TextRun({ text: "Confidential", font: FONT, size: 16, color: "CC0000", bold: true }),
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 4 } },
          children: [
            new TextRun({ text: "Page ", font: FONT, size: 16, color: "999999" }),
            new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "999999" }),
            new TextRun({ text: "  |  G9-IPTS  |  April 2026  |  Version 6.0", font: FONT, size: 16, color: "999999" }),
          ]
        })]
      })
    },
    children: [
      ...coverPage,
      ...tocSection,
      ...section1,
      ...section2,
      ...section3,
      ...section4,
      ...section5,
      ...section6,
      ...section7fx,
      ...section8sec,
      ...section9,
      ...section10,
      ...section11,
      ...section12,
      ...section13,
      ...section14,
    ]
  }]
});

// ── Write to file ──────────────────────────────────────────────
const outPath = path.join(DOCS_DIR, "G9-IPTS_Executive_Briefing.docx");
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log(`Executive Briefing generated: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}).catch(err => {
  console.error("Error generating briefing:", err);
  process.exit(1);
});
