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
  // Architecture files start with "ipts_", screenshots are numbered "01_" through "12_"
  if (filename.startsWith("ipts_")) {
    return path.join(ARCH_DIR, filename);
  }
  return path.join(SCREENSHOTS_DIR, filename);
}

function imageParagraph(filePath, width, height, title, description) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 80 },
    children: [
      new ImageRun({
        type: "png",
        data: fs.readFileSync(filePath),
        transformation: { width, height },
        altText: {
          title: title,
          description: description,
          name: path.basename(filePath, ".png"),
        },
      }),
    ],
  });
}

function imageCaption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 18,
        italics: true,
        color: "777777",
      }),
    ],
  });
}

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
    children: [new TextRun({ text: "April 2026", font: FONT, size: 24, color: "666666" })]
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
  // Manual TOC entries
  ...[
    ["1.", "Executive Summary", "3"],
    ["2.", "The Problem: Cross-Border Settlement Today", "4"],
    ["3.", "IPTS 7-Layer Convergent Architecture", "6"],
    ["4.", "System Walkthrough", "12"],
    ["5.", "AI/ML Capabilities", "16"],
    ["6.", "Security & Compliance", "18"],
    ["7.", "ROI Analysis", "20"],
    ["8.", "Total Cost of Ownership (TCO)", "21"],
    ["9.", "Business Impact", "22"],
    ["10.", "Risk Assessment", "23"],
    ["11.", "Implementation Roadmap", "24"],
    ["12.", "Conclusion & Recommendations", "25"],
  ].map(([num, title, pg]) =>
    new Paragraph({
      spacing: { after: 100 },
      tabStops: [
        { type: "right", position: CONTENT_WIDTH, leader: "dot" }
      ],
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
  para("The Integrated Payment Transformation System (IPTS) is an enterprise-grade financial settlement platform that collapses cross-border payment cycles from the traditional T+2 to T+5 window to near-real-time settlement in under 10 seconds. Built on a 7-layer convergent architecture, IPTS integrates blockchain-based atomic settlement, a 4-model AI/ML fraud detection ensemble, Zero Trust security, and GDPR-compliant data sovereignty into a unified platform."),
  emptyLine(),
  para("This briefing provides senior leadership with a comprehensive overview of IPTS capabilities, financial impact, risk posture, and implementation roadmap. The following KPI comparison summarizes the transformational impact:"),
  emptyLine(),

  heading2("1.1 Key Performance Indicators"),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [3200, 3080, 3080],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("KPI Metric", 3200),
        makeHeaderCell("Before IPTS", 3080),
        makeHeaderCell("After IPTS", 3080),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Settlement Time", 3200, { shading: COLOR_TABLE_ALT }),
        makeCell("T+2 to T+5 (2-5 business days)", 3080, { shading: COLOR_TABLE_ALT }),
        makeBoldCell("< 10 seconds (T+0)", 3080, { shading: COLOR_TABLE_ALT, color: C2 }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Fraud Detection Rate", 3200),
        makeCell("45-60% (rule-based only)", 3080),
        makeBoldCell("98-100% (4-model ensemble)", 3080, { color: C2 }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("False Positive Rate", 3200, { shading: COLOR_TABLE_ALT }),
        makeCell("15-25%", 3080, { shading: COLOR_TABLE_ALT }),
        makeBoldCell("< 3%", 3080, { shading: COLOR_TABLE_ALT, color: C2 }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Compliance Cost", 3200),
        makeCell("$10.2M annually", 3080),
        makeBoldCell("$2.55M annually", 3080, { color: C2 }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Annual Net Savings", 3200, { shading: COLOR_TABLE_ALT }),
        makeCell("Baseline", 3080, { shading: COLOR_TABLE_ALT }),
        makeBoldCell("$7.65M per year", 3080, { shading: COLOR_TABLE_ALT, color: C2 }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("3-Year ROI", 3200),
        makeCell("N/A", 3080),
        makeBoldCell("287%", 3080, { color: C2 }),
      ]}),
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
  para("An estimated $27 trillion sits locked in Nostro/Vostro accounts globally. Correspondent banks must pre-fund these accounts to facilitate cross-border flows, creating massive opportunity costs. Every dollar sitting in a Nostro account is a dollar that cannot be deployed in higher-yielding activities. For mid-tier banks, Nostro funding requirements can represent 5-8% of total assets."),
  emptyLine(),

  heading2("2.3 Compliance Overhead"),
  para("Financial institutions spend an average of $10.2 million annually on AML/KYC compliance operations. Manual transaction monitoring generates false positive rates of 15-25%, requiring large compliance teams to triage alerts. Each false positive costs an estimated $30-$50 in analyst time. Regulatory fines for AML failures have exceeded $36 billion globally since 2008, creating existential risk for non-compliant institutions."),
  emptyLine(),

  heading2("2.4 Fragmented Infrastructure"),
  para("The current cross-border settlement ecosystem involves multiple intermediaries: originating banks, correspondent banks, clearing houses, SWIFT messaging, local payment rails, and beneficiary banks. Each intermediary adds cost ($25-$65 per transaction in fees), latency (hours to days), and opacity (limited end-to-end tracking). The absence of a unified platform means reconciliation is manual, error-prone, and resource-intensive."),
  emptyLine(),

  heading2("2.5 Regulatory Pressure"),
  para("Regulators worldwide are tightening oversight of cross-border payments. The Financial Action Task Force (FATF) Travel Rule, the EU's 6th Anti-Money Laundering Directive (6AMLD), FinCEN's evolving requirements, and GDPR's data sovereignty mandates create a complex, overlapping compliance landscape. Institutions must simultaneously satisfy multiple jurisdictions with conflicting requirements while maintaining operational efficiency."),
  emptyLine(),

  heading2("2.6 Market Opportunity"),
  para("The $190 trillion cross-border payments market is at an inflection point. Institutions that modernize their settlement infrastructure will capture market share from slower incumbents, reduce operational costs by 60-75%, and position themselves for the next decade of financial services innovation. IPTS directly addresses each of these pain points through its 7-layer convergent architecture."),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 3 - 7-LAYER ARCHITECTURE =====
// ═══════════════════════════════════════════════════════════════
const section3 = [
  heading1("3. IPTS 7-Layer Convergent Architecture"),
  para("IPTS implements a 7-Layer Convergent Architecture where each layer encapsulates a specific domain concern. This separation enables independent scaling, testing, and regulatory auditing while maintaining cohesive end-to-end transaction processing. The layers are organized into three logical tiers: Interaction and Intelligence (Layers 1-3), Security and Compliance (Layers 4-5), and Settlement Infrastructure (Layers 6-7)."),
  emptyLine(),

  heading2("3.1 Architecture Overview"),
  para("The complete IPTS architecture integrates seven distinct layers, each responsible for a critical domain of the settlement lifecycle. The following diagram provides the full architectural overview:"),
  imageParagraph(
    loadImage("ipts_seven_layer_convergent_architecture.png"),
    580, 700,
    "IPTS Seven-Layer Convergent Architecture",
    "Complete overview of the IPTS 7-layer architecture showing all layers from Interaction through Infrastructure"
  ),
  imageCaption("Figure 1: IPTS Seven-Layer Convergent Architecture Overview"),
  emptyLine(),

  // Architecture layers summary table
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [1400, 2200, 5760],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("Layer", 1400),
        makeHeaderCell("Name", 2200),
        makeHeaderCell("Description", 5760),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Layer 1", 1400, { shading: COLOR_TABLE_ALT }),
        makeCell("Interaction", 2200, { shading: COLOR_TABLE_ALT }),
        makeCell("Digital portals, wallets, and automated triggers serving as entry points for all transaction requests", 5760, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Layer 2", 1400),
        makeCell("Integration", 2200),
        makeCell("ISO 20022 message formatting, core banking connectivity, RTGS interfacing, and API gateway", 5760),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Layer 3", 1400, { shading: COLOR_TABLE_ALT }),
        makeCell("Intelligence", 2200, { shading: COLOR_TABLE_ALT }),
        makeCell("4-model ML ensemble, AML/KYC screening engine, graph analytics, and NLP sanctions screening", 5760, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Layer 4", 1400),
        makeCell("Security", 2200),
        makeCell("Zero Trust perimeter with JWT authentication, RBAC, AES-256 encryption, and HSM key management", 5760),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Layer 5", 1400, { shading: COLOR_TABLE_ALT }),
        makeCell("Compliance", 2200, { shading: COLOR_TABLE_ALT }),
        makeCell("HITL triage queue, case management lifecycle, SAR reporting, and real-time sanctions screening", 5760, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Layer 6", 1400),
        makeCell("Distributed Ledger", 2200),
        makeCell("Atomic swap engine, smart contract execution, Nostro/Vostro management, multi-signature approvals", 5760),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Layer 7", 1400, { shading: COLOR_TABLE_ALT }),
        makeCell("Data & Infrastructure", 2200, { shading: COLOR_TABLE_ALT }),
        makeCell("Hash anchoring, Merkle tree verification, GDPR PII vault, hybrid cloud backbone, observability stack", 5760, { shading: COLOR_TABLE_ALT }),
      ]}),
    ]
  }),
  pageBreak(),

  // ── Layer 1: Interaction ──
  heading2("3.2 Layer 1 \u2014 Interaction Architecture"),
  para("The Interaction Layer serves as the primary interface between external users and the IPTS platform. It defines three categories of interaction entry points: digital portals (web-based dashboards and administrative consoles), wallet integrations (for direct blockchain-based transaction initiation), and automated triggers (scheduled batch processing and event-driven transaction flows). Each entry point feeds into a unified request pipeline that normalizes input formats before passing them to the Integration Layer. The architecture ensures that regardless of the originating channel, all transactions undergo identical validation, authentication, and enrichment before entering the processing pipeline."),
  imageParagraph(
    loadImage("ipts_layer1_interaction_architecture.png"),
    500, 300,
    "IPTS Interaction Layer Architecture",
    "Layer 1 Interaction architecture showing digital portals, wallet integrations, and automated triggers"
  ),
  imageCaption("Figure 2: Layer 1 \u2014 Interaction Architecture"),
  emptyLine(),

  // ── Layer 2: Integration ──
  heading2("3.3 Layer 2 \u2014 Integration Architecture"),
  para("The Integration Layer connects IPTS with the broader financial ecosystem. External systems including originating banks, beneficiary banks, regulatory bodies, and FX/liquidity providers communicate through a centralized API Gateway that enforces rate limiting, authentication validation, request routing, and schema validation. Incoming messages pass through a Message Transformer that provides ISO 20022 parsing, format adaptation between legacy and modern message standards, and data enrichment with reference data. Transformed messages are then dispatched to internal services via an event bus, ensuring loose coupling between the integration boundary and core processing logic. This architecture enables IPTS to interface with SWIFT, SEPA, Fedwire, and proprietary banking protocols without modifying internal settlement logic."),
  imageParagraph(
    loadImage("ipts_layer1_integration_architecture.png"),
    500, 330,
    "IPTS Integration Layer Architecture",
    "Layer 2 Integration architecture showing external systems connecting through API Gateway and Message Transformer"
  ),
  imageCaption("Figure 3: Layer 2 \u2014 Integration Architecture"),
  emptyLine(),

  // ── Layer 3: Intelligence ──
  heading2("3.4 Layer 3 \u2014 Intelligence Engine"),
  para("The Intelligence Layer is the cognitive core of IPTS. It houses the 4-model machine learning ensemble (Isolation Forest, Random Forest, XGBoost, Autoencoder) that provides real-time risk scoring for every transaction. The AML/KYC screening engine applies a weighted composite scoring system combining rule-based checks (30%), ML ensemble predictions (40%), NLP watchlist screening (15%), and graph analytics (15%). PageRank centrality analysis identifies high-influence nodes in the transaction network, while label propagation detects suspicious community clusters. Force-override triggers automatically block transactions exceeding critical thresholds ($100K+ AML threshold, sanctions matches, structuring patterns). The layer operates in real-time, returning risk scores within milliseconds of transaction submission."),
  emptyLine(),

  // ── Layer 4: Security ──
  heading2("3.5 Layer 4 \u2014 Zero Trust Security Architecture"),
  para("The Security Layer implements a comprehensive Zero Trust model where no request is implicitly trusted regardless of origin. The architecture provides Identity and Access Management with zero-knowledge proof verification and multi-factor authentication; Micro-segmentation for network isolation and lateral movement prevention; Continuous Verification ensuring trust is re-evaluated at every request boundary; a Cryptographic Layer with PKI infrastructure, HSM integration, and TLS 1.3 mutual authentication; and Threat Intelligence integrating SIEM monitoring, anomaly detection, and external threat feeds for proactive defense."),
  imageParagraph(
    loadImage("ipts_layer2_security_architecture.png"),
    500, 320,
    "IPTS Zero Trust Security Architecture",
    "Layer 4 Security architecture showing Identity Management, Micro-segmentation, Continuous Verification, and Threat Intelligence"
  ),
  imageCaption("Figure 4: Layer 4 \u2014 Zero Trust Security Architecture"),
  emptyLine(),

  // ── Layer 5: Compliance ──
  heading2("3.6 Layer 5 \u2014 Compliance & Case Management"),
  para("The Compliance Layer provides the human-in-the-loop (HITL) triage queue for blocked transactions, a full case management lifecycle (Open, Investigating, Escalated, Resolved, Closed), SAR filing workflows, and real-time screening against global sanctions databases. When a transaction is blocked by the Intelligence Layer, a compliance case is automatically created in CASE-2026-XXXX format with severity classification. Compliance officers can investigate, add findings, assign cases, escalate to senior compliance, and file Suspicious Activity Reports directly from the platform. The layer supports FATF Travel Rule compliance, 6AMLD reporting requirements, and FinCEN BSA obligations."),
  emptyLine(),
  pageBreak(),

  // ── Layer 6: Data ──
  heading2("3.7 Layer 6 \u2014 Data Architecture"),
  para("The Data Layer ensures the integrity, immutability, and regulatory compliance of all settlement data. The Hash Anchoring subsystem computes SHA-256 hashes of transaction payloads and anchors Merkle tree roots on-chain, creating a cryptographic proof chain verifiable without exposing raw data. The Tamper-Evident Audit Trail maintains immutable logs with cryptographic timestamps and chain of custody records. The GDPR Compliance Vault stores encrypted PII in a segregated database with consent management and right-to-erasure implementation. A Reconciliation Engine continuously verifies consistency between on-chain records, off-chain vault data, and the audit trail."),
  imageParagraph(
    loadImage("ipts_layer6_data_architecture.png"),
    500, 320,
    "IPTS Data Layer Architecture",
    "Layer 6 Data architecture showing Hash Anchoring, Audit Trail, GDPR Vault, and Reconciliation Engine"
  ),
  imageCaption("Figure 5: Layer 6 \u2014 Data Architecture"),
  emptyLine(),

  // ── Layer 7: Infrastructure ──
  heading2("3.8 Layer 7 \u2014 Infrastructure Architecture"),
  para("The Infrastructure Layer provides the runtime foundation for the IPTS platform. The Hybrid Cloud Backbone orchestrates workloads across private and public cloud infrastructure through Kubernetes. Validator Nodes form the consensus layer with Byzantine Fault Tolerance (BFT) threshold configurations. The Observability Stack provides Prometheus metrics, distributed tracing, and centralized log aggregation. The Disaster Recovery subsystem ensures business continuity with geo-replicated data stores, automatic failover, RPO < 1 minute, and RTO < 5 minutes for full service restoration."),
  imageParagraph(
    loadImage("ipts_layer7_infrastructure_architecture.png"),
    500, 320,
    "IPTS Infrastructure Architecture",
    "Layer 7 Infrastructure showing Hybrid Cloud Backbone, Validator Nodes, Observability Stack, and Disaster Recovery"
  ),
  imageCaption("Figure 6: Layer 7 \u2014 Infrastructure Architecture"),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 4 - SYSTEM WALKTHROUGH =====
// ═══════════════════════════════════════════════════════════════
const section4 = [
  heading1("4. System Walkthrough"),
  para("The following screenshots demonstrate the fully operational IPTS platform, covering all major functional areas from the real-time dashboard through case management lifecycle. Each screenshot is captured from the live system deployed on Google Colab."),
  emptyLine(),

  // 01 - Dashboard KPIs
  heading2("4.1 Dashboard \u2014 KPIs & Telemetry"),
  para("The main operational dashboard provides at-a-glance system health with KPI cards (Total Settlements, Blocked, Flagged, Nostro Liquidity), settlement volume charting, and color-coded status indicators. Auto-refresh via Server-Sent Events ensures real-time data streaming every 6 seconds."),
  imageParagraph(
    loadImage("01_dashboard_kpi.png"),
    580, 310,
    "Dashboard KPI Cards",
    "Dashboard view showing KPI cards and settlement volume chart"
  ),
  imageCaption("Figure 7: Dashboard \u2014 KPI Cards and Settlement Volume Chart"),
  emptyLine(),

  // 02 - Dashboard Telemetry
  heading2("4.2 Dashboard \u2014 Payment Execution"),
  para("The AML Telemetry Live Ledger displays all processed transactions with sender name, beneficiary, amount, risk score, settlement status, and blockchain hash. Color-coded rows indicate transaction status: green (settled), yellow (flagged), red (blocked), and purple (pending)."),
  imageParagraph(
    loadImage("02_dashboard_telemetry.png"),
    580, 310,
    "Dashboard AML Telemetry",
    "Dashboard scrolled down showing the AML Telemetry Live Ledger table"
  ),
  imageCaption("Figure 8: Dashboard \u2014 AML Telemetry Live Ledger"),
  emptyLine(),

  // 03 - Payments Settlement
  heading2("4.3 Settlement Result & Risk Breakdown"),
  para("The Payments tab enables cross-border payment execution with real-time risk assessment. Post-settlement, a detailed risk breakdown visualization displays individual component scores (rules, ML ensemble, NLP watchlist, graph analytics) alongside the composite risk score and settlement time."),
  imageParagraph(
    loadImage("03_payments_settlement.png"),
    580, 310,
    "Payments Settlement Interface",
    "Payments tab showing settlement result with risk score and breakdown bars"
  ),
  imageCaption("Figure 9: Payments \u2014 Settlement Execution with Risk Breakdown"),
  pageBreak(),

  // 04 - AI/ML Models
  heading2("4.4 AI/ML Model Performance"),
  para("The AI/ML tab displays performance metrics for all four ensemble models, including F1 scores and accuracy. Feature importance charts show the relative contribution of each feature to fraud detection. Model retraining can be triggered by authorized users directly from the interface."),
  imageParagraph(
    loadImage("04_aiml_models.png"),
    580, 340,
    "AI/ML Model Performance",
    "AI/ML tab showing 4 model cards and Feature Importance chart"
  ),
  imageCaption("Figure 10: AI/ML \u2014 Model Performance Cards and Feature Importance"),
  emptyLine(),

  // 05 - Network Graph
  heading2("4.5 Network Graph"),
  para("The interactive D3.js force-directed graph visualizes the transaction network with node size proportional to PageRank centrality, color-coded communities via label propagation, edge thickness reflecting transaction volume, and cycle highlighting to identify potential laundering rings."),
  imageParagraph(
    loadImage("05_network_graph.png"),
    580, 260,
    "Network Graph Visualization",
    "Network Graph tab showing D3.js force-directed graph with colored nodes"
  ),
  imageCaption("Figure 11: Network Graph \u2014 D3.js Force-Directed Transaction Network"),
  emptyLine(),

  // 06 - Admin HITL
  heading2("4.6 Admin \u2014 HITL Queue & Audit"),
  para("The Admin tab provides the Human-in-the-Loop queue for reviewing blocked transactions with full risk details, approve/reject controls, and comprehensive audit logging. The GDPR Erasure tool enables compliant data anonymization on request."),
  imageParagraph(
    loadImage("06_admin_hitl.png"),
    580, 330,
    "Admin HITL Queue",
    "Admin tab showing HITL Queue with blocked transactions, Audit Log, and GDPR Erasure"
  ),
  imageCaption("Figure 12: Admin \u2014 HITL Queue, Audit Log, and GDPR Erasure"),
  emptyLine(),

  // 07 - Compliance
  heading2("4.7 Compliance \u2014 Sanctions & SWIFT GPI"),
  para("The Compliance tab provides sanctions list management, SWIFT GPI payment tracking by UETR reference, and Nostro balance monitoring. Compliance officers can add and remove entities from the sanctions screening database in real time."),
  imageParagraph(
    loadImage("07_compliance.png"),
    580, 260,
    "Compliance Tab",
    "Compliance tab showing Sanctions Management, SWIFT GPI Tracker, and Nostro Balances"
  ),
  imageCaption("Figure 13: Compliance \u2014 Sanctions, SWIFT GPI, and Nostro Balances"),
  pageBreak(),

  // 08 - Case Management
  heading2("4.8 Case Management Dashboard"),
  para("The Case Management interface provides full compliance case lifecycle tracking with summary cards (Open, Investigating, Escalated, Resolved), filterable case tables by status, severity, and type, and support for case types including AML, Sanctions, Fraud, Structuring, PEP, and Terrorist Financing."),
  imageParagraph(
    loadImage("08_case_management.png"),
    580, 280,
    "Case Management Overview",
    "Case Management tab showing summary cards and case table"
  ),
  imageCaption("Figure 14: Case Management \u2014 Overview with Summary Cards"),
  emptyLine(),

  // 09 - Case Detail
  heading2("4.9 Case Detail Modal"),
  para("Each case opens in a detailed modal showing full case information: status, type, risk score, associated transaction details (sender, beneficiary, amount), and action buttons for investigation, escalation, assignment, findings entry, and SAR filing."),
  imageParagraph(
    loadImage("09_case_detail.png"),
    440, 380,
    "Case Detail Modal",
    "Case detail modal showing status, type, risk score, and action buttons"
  ),
  imageCaption("Figure 15: Case Detail \u2014 Full Case View with Action Buttons"),
  emptyLine(),

  // 10 - Case Assignment
  heading2("4.10 Case Assignment"),
  para("Cases can be assigned to specific compliance officers through the assignment dialog. Assignment actions are logged to the audit trail, maintaining full chain-of-custody documentation for regulatory review."),
  imageParagraph(
    loadImage("10_case_assign.png"),
    440, 340,
    "Case Assignment Dialog",
    "Case assign dialog for assigning compliance officers"
  ),
  imageCaption("Figure 16: Case Management \u2014 Compliance Officer Assignment"),
  emptyLine(),

  // 11 - Cases Under Investigation
  heading2("4.11 Cases Under Investigation"),
  para("The investigation view tracks cases actively being reviewed, showing updated status indicators, assigned officers, and investigation timelines. The workflow supports multi-step investigation with progressive findings accumulation."),
  imageParagraph(
    loadImage("11_case_investigating.png"),
    580, 280,
    "Cases Under Investigation",
    "Case Management showing cases in investigating state with assigned officers"
  ),
  imageCaption("Figure 17: Case Management \u2014 Cases Under Investigation"),
  emptyLine(),

  // 12 - Resolved Cases
  heading2("4.12 Resolved Cases"),
  para("The resolved view demonstrates the full case lifecycle progression from Open through Investigating, Escalated, and Resolved states. All state transitions, findings, and resolutions are permanently recorded in the audit trail."),
  imageParagraph(
    loadImage("12_case_resolved.png"),
    580, 280,
    "Resolved Cases",
    "Case Management showing full lifecycle with resolved cases"
  ),
  imageCaption("Figure 18: Case Management \u2014 Full Lifecycle (Open, Investigating, Escalated, Resolved)"),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 5 - AI/ML CAPABILITIES =====
// ═══════════════════════════════════════════════════════════════
const section5 = [
  heading1("5. AI/ML Capabilities"),
  para("The IPTS Intelligence Layer deploys a 4-model machine learning ensemble trained on 15,000 synthetic transactions (97% legitimate, 3% fraudulent). The models operate as a weighted ensemble providing real-time risk scoring on every transaction within milliseconds."),
  emptyLine(),

  heading2("5.1 Model Ensemble Performance"),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [2000, 1800, 2000, 1800, 1760],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("Model", 2000),
        makeHeaderCell("Type", 1800),
        makeHeaderCell("Configuration", 2000),
        makeHeaderCell("F1 Score", 1800),
        makeHeaderCell("Accuracy", 1760),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Isolation Forest", 2000, { shading: COLOR_TABLE_ALT }),
        makeCell("Unsupervised", 1800, { shading: COLOR_TABLE_ALT }),
        makeCell("100 estimators, 3% contamination", 2000, { shading: COLOR_TABLE_ALT }),
        makeBoldCell("98.0%", 1800, { shading: COLOR_TABLE_ALT, color: C2 }),
        makeCell("68.4%", 1760, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Random Forest", 2000),
        makeCell("Supervised", 1800),
        makeCell("200 estimators, SMOTE", 2000),
        makeBoldCell("100%", 1800, { color: C2 }),
        makeCell("100%", 1760),
      ]}),
      new TableRow({ children: [
        makeBoldCell("XGBoost", 2000, { shading: COLOR_TABLE_ALT }),
        makeCell("Supervised", 1800, { shading: COLOR_TABLE_ALT }),
        makeCell("300 estimators, class-weighted", 2000, { shading: COLOR_TABLE_ALT }),
        makeBoldCell("100%", 1800, { shading: COLOR_TABLE_ALT, color: C2 }),
        makeCell("100%", 1760, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Autoencoder", 2000),
        makeCell("Semi-supervised", 1800),
        makeCell("64-32-16-32-64 MLP", 2000),
        makeBoldCell("96.7%", 1800, { color: C2 }),
        makeCell("59.9%", 1760),
      ]}),
    ]
  }),
  emptyLine(),

  heading2("5.2 NLP Watchlist Screening"),
  para("The NLP component performs fuzzy entity matching against sanctions databases and watchlists using string similarity algorithms. Entity names, aliases, and known affiliations are compared against transaction counterparty data. Matches trigger force-override scoring (95+), immediately blocking the transaction and creating a compliance case. The system screens against OFAC SDN, EU Consolidated List, UN Sanctions, and configurable custom watchlists."),
  emptyLine(),

  heading2("5.3 Graph Analytics"),
  para("NetworkX-based graph analysis provides three analytical capabilities. PageRank centrality computation identifies high-influence nodes that may represent money laundering hubs. Label propagation community detection uncovers suspicious transaction clusters. Targeted cycle detection on the fraud subgraph identifies potential laundering rings where funds circulate between entities to obscure their origin. These graph-derived risk signals are integrated into the composite scoring system at a 15% weight."),
  emptyLine(),

  heading2("5.4 Human-in-the-Loop (HITL)"),
  para("Blocked transactions are routed to a HITL triage queue where compliance officers review full risk details including all component scores, transaction context, and counterparty information. Officers can approve (releasing the transaction for settlement) or reject (permanently blocking and creating an audit record). All HITL decisions are logged with officer identity, timestamp, and rationale for regulatory review."),
  emptyLine(),

  heading2("5.5 Continuous Learning"),
  para("The platform supports model retraining triggered by authorized users (Admin and Data Scientist roles). Retraining regenerates synthetic training data, retrains all four models, recomputes graph analytics, and updates feature importance rankings. This capability enables the system to adapt to evolving fraud patterns and regulatory requirements without platform downtime."),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 6 - SECURITY & COMPLIANCE =====
// ═══════════════════════════════════════════════════════════════
const section6 = [
  heading1("6. Security & Compliance"),
  para("IPTS implements defense-in-depth security across all layers, combining Zero Trust access control, GDPR-compliant data sovereignty, and comprehensive regulatory mapping to satisfy global compliance requirements."),
  emptyLine(),

  heading2("6.1 Zero Trust Architecture"),
  para("The Zero Trust security model ensures that no request is implicitly trusted, regardless of origin. Every API call must present a valid JWT HS256 token (1-hour expiry) and pass role-based access control checks before processing."),
  emptyLine(),
  bulletBold("JWT Authentication: ", "HS256 tokens issued upon successful login, validated on every protected endpoint via @zero_trust_required decorator."),
  bulletBold("RBAC: ", "5 distinct roles (Admin, Operator, Auditor, Compliance, Data Scientist) with granular permission matrix controlling access to 9 feature areas."),
  bulletBold("Rate Limiting: ", "100 requests per minute per IP address to prevent abuse and DDoS mitigation."),
  bulletBold("Security Headers: ", "Strict-Transport-Security, X-Frame-Options: DENY, X-XSS-Protection, X-Content-Type-Options: nosniff, and configurable CORS policies."),
  emptyLine(),

  heading2("6.2 GDPR Dual-Storage Architecture"),
  para("IPTS separates personally identifiable information (PII) from transaction data using a dual-storage approach. The on-chain blockchain ledger stores settlement records with SHA-256 hash anchors, while the off-chain SQLite vault stores encrypted PII with GDPR consent tracking. The right-to-erasure API endpoint anonymizes PII in the vault and replaces sensitive fields with [REDACTED] while preserving on-chain hash integrity. This architecture ensures that blockchain immutability does not conflict with GDPR erasure requirements."),
  emptyLine(),

  heading2("6.3 Regulatory Mapping"),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [1800, 3800, 3760],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("Regulation", 1800),
        makeHeaderCell("Requirement", 3800),
        makeHeaderCell("IPTS Implementation", 3760),
      ]}),
      new TableRow({ children: [
        makeBoldCell("FATF Travel Rule", 1800, { shading: COLOR_TABLE_ALT }),
        makeCell("Originator/beneficiary info on transfers > $1,000", 3800, { shading: COLOR_TABLE_ALT }),
        makeCell("ISO 20022 payload with full counterparty data anchored on-chain", 3760, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("6AMLD (EU)", 1800),
        makeCell("Enhanced due diligence, predicate offence coverage", 3800),
        makeCell("4-model ML ensemble + NLP watchlist + graph analytics for risk scoring", 3760),
      ]}),
      new TableRow({ children: [
        makeBoldCell("GDPR", 1800, { shading: COLOR_TABLE_ALT }),
        makeCell("Data minimization, right to erasure, consent management", 3800, { shading: COLOR_TABLE_ALT }),
        makeCell("Off-chain PII vault with hash anchoring, erasure API, consent tracking", 3760, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("FinCEN BSA", 1800),
        makeCell("SAR filing, CTR reporting, AML program requirements", 3800),
        makeCell("Automated SAR filing workflow, $100K auto-block, case management lifecycle", 3760),
      ]}),
      new TableRow({ children: [
        makeBoldCell("PCI DSS", 1800, { shading: COLOR_TABLE_ALT }),
        makeCell("Secure cardholder data, access controls, monitoring", 3800, { shading: COLOR_TABLE_ALT }),
        makeCell("AES-256 encryption at rest, TLS 1.3 in transit, audit logging, RBAC", 3760, { shading: COLOR_TABLE_ALT }),
      ]}),
    ]
  }),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 7 - ROI ANALYSIS =====
// ═══════════════════════════════════════════════════════════════
const section7 = [
  heading1("7. ROI Analysis"),
  para("The financial case for IPTS is built on quantifiable cost reductions across compliance operations, settlement processing, fraud losses, and trapped liquidity. The following analysis compares current-state costs with projected IPTS-enabled costs."),
  emptyLine(),

  heading2("7.1 Annual Cost Comparison"),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [3500, 2930, 2930],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("Cost Category", 3500),
        makeHeaderCell("Current ($M)", 2930),
        makeHeaderCell("With IPTS ($M)", 2930),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Compliance Operations", 3500, { shading: COLOR_TABLE_ALT }),
        makeCell("$4.50M", 2930, { shading: COLOR_TABLE_ALT }),
        makeBoldCell("$1.10M", 2930, { shading: COLOR_TABLE_ALT, color: C2 }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Settlement Processing", 3500),
        makeCell("$2.20M", 2930),
        makeBoldCell("$0.55M", 2930, { color: C2 }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Fraud Losses", 3500, { shading: COLOR_TABLE_ALT }),
        makeCell("$1.80M", 2930, { shading: COLOR_TABLE_ALT }),
        makeBoldCell("$0.40M", 2930, { shading: COLOR_TABLE_ALT, color: C2 }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Trapped Liquidity Cost", 3500),
        makeCell("$1.20M", 2930),
        makeBoldCell("$0.30M", 2930, { color: C2 }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Regulatory Fines (Avg)", 3500, { shading: COLOR_TABLE_ALT }),
        makeCell("$0.50M", 2930, { shading: COLOR_TABLE_ALT }),
        makeBoldCell("$0.20M", 2930, { shading: COLOR_TABLE_ALT, color: C2 }),
      ]}),
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

  heading2("7.2 3-Year ROI Projection"),
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
      new TableRow({ children: [
        makeBoldCell("Cumulative Investment", 2340, { shading: COLOR_TABLE_ALT }),
        makeCell("$3.20M", 2340, { shading: COLOR_TABLE_ALT }),
        makeCell("$4.00M", 2340, { shading: COLOR_TABLE_ALT }),
        makeCell("$4.80M", 2340, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Cumulative Savings", 2340),
        makeCell("$7.65M", 2340),
        makeCell("$15.30M", 2340),
        makeCell("$22.95M", 2340),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Cumulative Net Benefit", 2340, { shading: COLOR_TABLE_ALT }),
        makeBoldCell("$4.45M", 2340, { shading: COLOR_TABLE_ALT, color: C2 }),
        makeBoldCell("$11.30M", 2340, { shading: COLOR_TABLE_ALT, color: C2 }),
        makeBoldCell("$18.15M", 2340, { shading: COLOR_TABLE_ALT, color: C2 }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("ROI", 2340),
        makeBoldCell("+139%", 2340, { color: C2 }),
        makeBoldCell("+238%", 2340, { color: C2 }),
        makeBoldCell("+287%", 2340, { color: C2 }),
      ]}),
    ]
  }),
  emptyLine(),
  boldPara("Payback Period: ", "5 months from initial deployment. The platform generates positive ROI within the first half-year of operation."),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 8 - TCO =====
// ═══════════════════════════════════════════════════════════════
const section8 = [
  heading1("8. Total Cost of Ownership (TCO)"),
  para("The TCO model captures all direct and indirect costs associated with IPTS implementation, including initial development, ongoing operations, and platform evolution over a 3-year horizon."),
  emptyLine(),

  heading2("8.1 Year 1 Investment Breakdown"),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [4680, 2340, 2340],
    rows: [
      new TableRow({ children: [
        makeHeaderCell("Cost Component", 4680),
        makeHeaderCell("Amount", 2340),
        makeHeaderCell("% of Total", 2340),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Platform Development", 4680, { shading: COLOR_TABLE_ALT }),
        makeCell("$1,200,000", 2340, { shading: COLOR_TABLE_ALT }),
        makeCell("37.5%", 2340, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("AI/ML Development & Training", 4680),
        makeCell("$400,000", 2340),
        makeCell("12.5%", 2340),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Blockchain Infrastructure", 4680, { shading: COLOR_TABLE_ALT }),
        makeCell("$350,000", 2340, { shading: COLOR_TABLE_ALT }),
        makeCell("10.9%", 2340, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Security & Compliance Tooling", 4680),
        makeCell("$250,000", 2340),
        makeCell("7.8%", 2340),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Cloud Infrastructure & Hosting", 4680, { shading: COLOR_TABLE_ALT }),
        makeCell("$480,000", 2340, { shading: COLOR_TABLE_ALT }),
        makeCell("15.0%", 2340, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Integration & Testing", 4680),
        makeCell("$320,000", 2340),
        makeCell("10.0%", 2340),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Training & Change Management", 4680, { shading: COLOR_TABLE_ALT }),
        makeCell("$200,000", 2340, { shading: COLOR_TABLE_ALT }),
        makeCell("6.3%", 2340, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("YEAR 1 TOTAL", 4680, { color: C1 }),
        makeBoldCell("$3,200,000", 2340, { color: C1 }),
        makeBoldCell("100%", 2340, { color: C1 }),
      ]}),
    ]
  }),
  emptyLine(),

  heading2("8.2 Ongoing Operations (Year 2+)"),
  para("Annual operational costs stabilize at approximately $800,000 per year, covering cloud infrastructure, ML model maintenance, security updates, compliance database subscriptions, and platform support. This represents a 75% reduction from Year 1 investment as development costs are amortized."),
  emptyLine(),

  heading2("8.3 3-Year TCO Summary"),
  bulletBold("Year 1: ", "$3,200,000 (initial development + infrastructure)"),
  bulletBold("Year 2: ", "$800,000 (operations + maintenance)"),
  bulletBold("Year 3: ", "$800,000 (operations + maintenance)"),
  bulletBold("3-Year Total TCO: ", "$4,800,000"),
  bulletBold("3-Year Total Savings: ", "$22,950,000"),
  bulletBold("3-Year Net Benefit: ", "$18,150,000"),
  emptyLine(),
  para("The TCO model demonstrates that IPTS delivers substantial net value even in conservative scenarios. The 3-year net benefit of $18.15M represents a 3.78x return on total investment."),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 9 - BUSINESS IMPACT =====
// ═══════════════════════════════════════════════════════════════
const section9 = [
  heading1("9. Business Impact"),
  para("IPTS delivers measurable operational improvements across seven key performance indicators while enabling strategic business outcomes that position the organization for long-term competitive advantage."),
  emptyLine(),

  heading2("9.1 Operational Metrics"),
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
      new TableRow({ children: [
        makeBoldCell("Settlement Time", 2800, { shading: COLOR_TABLE_ALT }),
        makeCell("T+2 to T+5", 2200, { shading: COLOR_TABLE_ALT }),
        makeBoldCell("< 10 seconds", 2200, { shading: COLOR_TABLE_ALT, color: C2 }),
        makeBoldCell("99.9%", 2160, { shading: COLOR_TABLE_ALT, color: C2 }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Fraud Detection Rate", 2800),
        makeCell("45-60%", 2200),
        makeBoldCell("98-100%", 2200, { color: C2 }),
        makeBoldCell("+53-55%", 2160, { color: C2 }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("False Positive Rate", 2800, { shading: COLOR_TABLE_ALT }),
        makeCell("15-25%", 2200, { shading: COLOR_TABLE_ALT }),
        makeBoldCell("< 3%", 2200, { shading: COLOR_TABLE_ALT, color: C2 }),
        makeBoldCell("-88%", 2160, { shading: COLOR_TABLE_ALT, color: C2 }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Compliance Cost", 2800),
        makeCell("$10.2M/yr", 2200),
        makeBoldCell("$2.55M/yr", 2200, { color: C2 }),
        makeBoldCell("-75%", 2160, { color: C2 }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Nostro Liquidity Trapped", 2800, { shading: COLOR_TABLE_ALT }),
        makeCell("$27T globally", 2200, { shading: COLOR_TABLE_ALT }),
        makeBoldCell("75% reduction", 2200, { shading: COLOR_TABLE_ALT, color: C2 }),
        makeBoldCell("-75%", 2160, { shading: COLOR_TABLE_ALT, color: C2 }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Transaction Throughput", 2800),
        makeCell("Batch processing", 2200),
        makeBoldCell("Real-time", 2200, { color: C2 }),
        makeBoldCell("Continuous", 2160, { color: C2 }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Audit Trail Coverage", 2800, { shading: COLOR_TABLE_ALT }),
        makeCell("Partial, manual", 2200, { shading: COLOR_TABLE_ALT }),
        makeBoldCell("100% automated", 2200, { shading: COLOR_TABLE_ALT, color: C2 }),
        makeBoldCell("100%", 2160, { shading: COLOR_TABLE_ALT, color: C2 }),
      ]}),
    ]
  }),
  emptyLine(),

  heading2("9.2 Strategic Outcomes"),
  emptyLine(),
  heading3("Customer Experience"),
  para("Near-real-time settlement eliminates multi-day waiting periods for cross-border payments, enabling same-day international transfers. Corporate clients gain immediate certainty of payment finality, reducing the need for bridge financing and improving cash flow management. The transparent risk breakdown builds trust with customers by providing visibility into settlement decisions."),
  emptyLine(),

  heading3("Revenue Growth (12-18%)"),
  para("Faster settlement cycles enable higher transaction volumes and attract premium corporate clients willing to pay for speed. The platform's AI capabilities allow competitive pricing of correspondent banking services while maintaining healthy margins. Market analysis indicates a 12-18% revenue growth opportunity from cross-border payment modernization within the first 24 months."),
  emptyLine(),

  heading3("Regulatory Confidence"),
  para("Proactive compliance posture with automated case management, SAR filing, and comprehensive audit trails positions the organization favorably with regulators. The platform's ability to demonstrate real-time sanctions screening, ML-driven risk assessment, and complete transaction traceability reduces examination findings and regulatory remediation costs."),
  emptyLine(),

  heading3("Competitive Positioning"),
  para("IPTS places the organization at the forefront of payment infrastructure innovation. Early adoption of blockchain settlement, AI fraud detection, and Zero Trust security creates a competitive moat that is difficult and costly for competitors to replicate. The platform's modular architecture allows rapid adaptation to new regulatory requirements and market demands."),
  emptyLine(),

  heading3("Risk Reduction"),
  para("The 4-model ML ensemble reduces fraud losses by 78% while the GDPR dual-storage architecture eliminates data sovereignty risk. Blockchain immutability provides an irrefutable settlement record that protects against disputes. Automated compliance workflows reduce the risk of human error in AML screening, sanctions checking, and regulatory reporting."),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 10 - RISK ASSESSMENT =====
// ═══════════════════════════════════════════════════════════════
const section10 = [
  heading1("10. Risk Assessment"),
  para("The following risk matrix identifies the five principal risks to IPTS implementation, their likelihood and impact ratings, and the mitigation strategies in place. All risks are assessed on a scale of Low, Medium, and High."),
  emptyLine(),

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
      new TableRow({ children: [
        makeBoldCell("Regulatory Uncertainty", 2000, { shading: COLOR_TABLE_ALT }),
        makeBoldCell("Medium", 1100, { shading: COLOR_TABLE_ALT, color: "E67E00" }),
        makeBoldCell("High", 1100, { shading: COLOR_TABLE_ALT, color: "CC0000" }),
        makeCell("Modular compliance layer allows rapid adaptation to new regulations. Regulatory mapping covers FATF, 6AMLD, GDPR, FinCEN, and PCI DSS. Dedicated compliance team monitors regulatory changes.", 5160, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Integration Complexity", 2000),
        makeBoldCell("Medium", 1100, { color: "E67E00" }),
        makeBoldCell("Medium", 1100, { color: "E67E00" }),
        makeCell("Phased implementation approach with 6 gates. API Gateway with ISO 20022 message transformer enables standards-based integration. Event bus architecture ensures loose coupling.", 5160),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Model Drift", 2000, { shading: COLOR_TABLE_ALT }),
        makeBoldCell("Medium", 1100, { shading: COLOR_TABLE_ALT, color: "E67E00" }),
        makeBoldCell("Medium", 1100, { shading: COLOR_TABLE_ALT, color: "E67E00" }),
        makeCell("On-demand model retraining capability. 4-model ensemble provides redundancy against individual model degradation. Continuous monitoring of F1 scores and accuracy metrics.", 5160, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Blockchain Performance", 2000),
        makeBoldCell("Low", 1100, { color: "0E8C5F" }),
        makeBoldCell("Medium", 1100, { color: "E67E00" }),
        makeCell("Layer 2 scaling solutions (Polygon, Arbitrum) planned for production. Off-chain PII storage reduces on-chain data volume. Smart contract optimization for gas efficiency.", 5160),
      ]}),
      new TableRow({ children: [
        makeBoldCell("Talent & Expertise", 2000, { shading: COLOR_TABLE_ALT }),
        makeBoldCell("Medium", 1100, { shading: COLOR_TABLE_ALT, color: "E67E00" }),
        makeBoldCell("Low", 1100, { shading: COLOR_TABLE_ALT, color: "0E8C5F" }),
        makeCell("Training and change management budget allocated ($200K Year 1). Platform designed for operational simplicity. Comprehensive documentation and runbooks.", 5160, { shading: COLOR_TABLE_ALT }),
      ]}),
    ]
  }),
  emptyLine(),
  para("Overall risk posture is assessed as Moderate with effective mitigation strategies in place. The phased implementation approach (Section 11) allows for progressive risk reduction through gate-based validation at each phase boundary."),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 11 - IMPLEMENTATION ROADMAP =====
// ═══════════════════════════════════════════════════════════════
const section11 = [
  heading1("11. Implementation Roadmap"),
  para("The IPTS implementation follows a 6-phase, 12-month roadmap with defined gate criteria at each phase boundary. Each phase builds on the validated outputs of the previous phase, minimizing risk through progressive capability delivery."),
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
      new TableRow({ children: [
        makeBoldCell("1. Foundation", 1600, { shading: COLOR_TABLE_ALT }),
        makeCell("2 months", 1300, { shading: COLOR_TABLE_ALT }),
        makeCell("M1-M2", 1300, { shading: COLOR_TABLE_ALT }),
        makeCell("Core platform, blockchain infrastructure, database schema, API framework", 2800, { shading: COLOR_TABLE_ALT }),
        makeCell("Smart contracts deployed, API endpoints functional", 2360, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("2. Intelligence", 1600),
        makeCell("2 months", 1300),
        makeCell("M3-M4", 1300),
        makeCell("4-model ML ensemble, NLP screening, graph analytics, risk scoring engine", 2800),
        makeCell("F1 > 95% on all models, composite scoring validated", 2360),
      ]}),
      new TableRow({ children: [
        makeBoldCell("3. Integration", 1600, { shading: COLOR_TABLE_ALT }),
        makeCell("2 months", 1300, { shading: COLOR_TABLE_ALT }),
        makeCell("M5-M6", 1300, { shading: COLOR_TABLE_ALT }),
        makeCell("ISO 20022 messaging, SWIFT GPI, case management, HITL workflows", 2800, { shading: COLOR_TABLE_ALT }),
        makeCell("End-to-end settlement flow tested, case lifecycle validated", 2360, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("4. Security", 1600),
        makeCell("2 months", 1300),
        makeCell("M7-M8", 1300),
        makeCell("Zero Trust implementation, GDPR vault, RBAC, security hardening, pen testing", 2800),
        makeCell("Security audit passed, GDPR compliance validated", 2360),
      ]}),
      new TableRow({ children: [
        makeBoldCell("5. Pilot", 1600, { shading: COLOR_TABLE_ALT }),
        makeCell("2 months", 1300, { shading: COLOR_TABLE_ALT }),
        makeCell("M9-M10", 1300, { shading: COLOR_TABLE_ALT }),
        makeCell("Controlled production pilot with select corridors, performance tuning, UAT", 2800, { shading: COLOR_TABLE_ALT }),
        makeCell("Pilot KPIs met, user acceptance > 90%, zero critical defects", 2360, { shading: COLOR_TABLE_ALT }),
      ]}),
      new TableRow({ children: [
        makeBoldCell("6. Scale", 1600),
        makeCell("2 months", 1300),
        makeCell("M11-M12", 1300),
        makeCell("Full production rollout, multi-corridor expansion, monitoring, training", 2800),
        makeCell("Production SLA met, all corridors live, runbooks complete", 2360),
      ]}),
    ]
  }),
  emptyLine(),
  para("Each phase includes a formal gate review where stakeholders validate deliverables against gate criteria before proceeding to the next phase. This disciplined approach ensures quality, manages risk, and provides clear decision points for senior leadership."),
  emptyLine(),
  boldPara("Total Timeline: ", "12 months from project initiation to full production at scale."),
  boldPara("Team Size: ", "8-12 engineers across backend, AI/ML, blockchain, security, and DevOps disciplines."),
  boldPara("Key Dependencies: ", "Cloud infrastructure provisioning (M1), regulatory sandbox approval (M5), pilot corridor partner agreements (M9)."),
  pageBreak(),
];

// ═══════════════════════════════════════════════════════════════
// ===== SECTION 12 - CONCLUSION =====
// ═══════════════════════════════════════════════════════════════
const section12 = [
  heading1("12. Conclusion & Recommendations"),
  para("IPTS represents a transformational platform that addresses the fundamental challenges of cross-border settlement through the convergence of blockchain, AI/ML, Zero Trust security, and GDPR-compliant data sovereignty. The following key takeaways summarize the strategic value proposition:"),
  emptyLine(),

  heading2("12.1 Key Takeaways"),
  emptyLine(),
  checkPara("Settlement cycles reduced from T+2-T+5 to under 10 seconds, enabling near-real-time atomic settlement with blockchain finality."),
  checkPara("4-model AI/ML ensemble achieves 98-100% fraud detection with < 3% false positives, reducing compliance analyst workload by 75%."),
  checkPara("Zero Trust security architecture with JWT authentication, RBAC, and rate limiting ensures no implicit trust across all system boundaries."),
  checkPara("GDPR dual-storage architecture separates PII from settlement data, enabling right-to-erasure without compromising blockchain immutability."),
  checkPara("3-year ROI of 287% with 5-month payback period, delivering $18.15M cumulative net benefit against $4.8M total investment."),
  checkPara("6-phase, 12-month implementation roadmap with gate-based validation minimizes delivery risk and enables progressive value realization."),
  emptyLine(),

  heading2("12.2 Recommendations"),
  para("Based on the analysis presented in this briefing, the following actions are recommended for senior leadership consideration:"),
  emptyLine(),

  boldPara("1. Approve Phase 1 Funding: ", "Authorize $3.2M Year 1 investment to begin the Foundation phase. The 5-month payback period ensures rapid return on investment, and the phased approach limits upfront financial exposure."),
  emptyLine(),
  boldPara("2. Establish Governance Committee: ", "Form a cross-functional steering committee comprising Technology, Compliance, Risk, and Business leadership to provide oversight, manage gate reviews, and ensure alignment with organizational strategy."),
  emptyLine(),
  boldPara("3. Initiate Regulatory Engagement: ", "Begin early dialogue with relevant regulatory bodies (FinCEN, FCA, MAS) to socialize the IPTS approach and secure regulatory sandbox participation for the Pilot phase (M9-M10)."),
  emptyLine(),
  boldPara("4. Secure Pilot Corridor Partners: ", "Identify and engage 2-3 correspondent banking partners for the controlled production pilot. Early partner alignment ensures smooth corridor activation in Phase 5."),
  emptyLine(),
  boldPara("5. Invest in Talent Development: ", "Allocate resources for upskilling existing teams in blockchain technology, AI/ML operations, and Zero Trust security. The $200K training budget in Year 1 is critical for building internal capability and reducing long-term dependency on external expertise."),

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
            new TextRun({ text: "G9-IPTS Executive Briefing", font: FONT, size: 16, color: "999999", italics: true }),
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
            new TextRun({ text: "  |  G9-IPTS  |  April 2026  |  Executive Briefing", font: FONT, size: 16, color: "999999" }),
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
      ...section7,
      ...section8,
      ...section9,
      ...section10,
      ...section11,
      ...section12,
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
