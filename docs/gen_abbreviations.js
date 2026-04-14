const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, BorderStyle, WidthType, ShadingType, HeadingLevel,
        VerticalAlign } = require('docx');
const fs = require('fs');

const abbreviations = [
  ["ACH", "Automated Clearing House"],
  ["AI", "Artificial Intelligence"],
  ["AI/ML", "Artificial Intelligence and Machine Learning"],
  ["AML", "Anti-Money Laundering"],
  ["AMM", "Automated Market Maker"],
  ["API", "Application Programming Interface"],
  ["BCP", "Business Continuity Planning"],
  ["BFT", "Byzantine Fault Tolerance"],
  ["BIS", "Bank for International Settlements"],
  ["COO", "Chief Operating Officer"],
  ["CRUD", "Create, Read, Update, Delete"],
  ["DeFi", "Decentralised Finance"],
  ["EU", "European Union"],
  ["FATF", "Financial Action Task Force"],
  ["FSB", "Financial Stability Board"],
  ["FX", "Foreign Exchange"],
  ["GDPR", "General Data Protection Regulation"],
  ["GPI", "Global Payments Innovation"],
  ["HITL", "Human-in-the-Loop"],
  ["HTLC", "Hashed Time-Lock Contract"],
  ["IBAN", "International Bank Account Number"],
  ["IPTS", "Integrated Payment Transformation System"],
  ["ISO", "International Organisation for Standardisation"],
  ["JWT", "JSON Web Token"],
  ["KPI", "Key Performance Indicator"],
  ["KSA", "Kingdom of Saudi Arabia"],
  ["KYC", "Know Your Customer"],
  ["LLM", "Large Language Model"],
  ["MiCA", "Markets in Crypto-Assets Regulation"],
  ["ML", "Machine Learning"],
  ["NIST", "National Institute of Standards and Technology"],
  ["NLP", "Natural Language Processing"],
  ["PBFT", "Practical Byzantine Fault Tolerance"],
  ["PII", "Personally Identifiable Information"],
  ["PQC", "Post-Quantum Cryptography"],
  ["RBAC", "Role-Based Access Control"],
  ["REST", "Representational State Transfer"],
  ["ROI", "Return on Investment"],
  ["RTGS", "Real-Time Gross Settlement"],
  ["SAR", "Suspicious Activity Report"],
  ["SEPA", "Single Euro Payments Area"],
  ["SHAP", "SHapley Additive exPlanations"],
  ["SLA", "Service Level Agreement"],
  ["SOAR", "Security Orchestration, Automation and Response"],
  ["SSE", "Server-Sent Events"],
  ["SSI", "Self-Sovereign Identity"],
  ["STP", "Straight-Through Processing"],
  ["SWIFT", "Society for Worldwide Interbank Financial Telecommunication"],
  ["TCO", "Total Cost of Ownership"],
  ["USD", "United States Dollar"],
  ["XAI", "Explainable Artificial Intelligence"],
  ["ZKP", "Zero-Knowledge Proof"],
];

const border = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const borders = { top: border, bottom: border, left: border, right: border };

const headerBorder = { style: BorderStyle.SINGLE, size: 6, color: "333333" };
const headerBorders = { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder };

const rows = [
  new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        borders: headerBorders,
        shading: { fill: "1F3864", type: ShadingType.CLEAR },
        width: { size: 2000, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Abbreviation", bold: true, color: "FFFFFF", font: "Times New Roman", size: 24 })]
        })]
      }),
      new TableCell({
        borders: headerBorders,
        shading: { fill: "1F3864", type: ShadingType.CLEAR },
        width: { size: 7360, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          children: [new TextRun({ text: "Full Term", bold: true, color: "FFFFFF", font: "Times New Roman", size: 24 })]
        })]
      }),
    ]
  }),
  ...abbreviations.map((row, i) => new TableRow({
    children: [
      new TableCell({
        borders,
        shading: { fill: i % 2 === 0 ? "F2F2F2" : "FFFFFF", type: ShadingType.CLEAR },
        width: { size: 2000, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: row[0], bold: true, font: "Times New Roman", size: 24 })]
        })]
      }),
      new TableCell({
        borders,
        shading: { fill: i % 2 === 0 ? "F2F2F2" : "FFFFFF", type: ShadingType.CLEAR },
        width: { size: 7360, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: row[1], font: "Times New Roman", size: 24 })]
        })]
      }),
    ]
  }))
];

const doc = new Document({
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 240 },
        children: [new TextRun({ text: "List of Abbreviations", bold: true, font: "Times New Roman", size: 28 })]
      }),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2000, 7360],
        rows
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/tmp/G9-IPTS_Abbreviations.docx', buf);
  console.log('Done');
});
