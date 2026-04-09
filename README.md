# G9-IPTS — Integrated Payment Transformation System

<div align="center">

![IPTS Banner](https://img.shields.io/badge/G9--IPTS-Enterprise%20Settlement%20Platform-10b981?style=for-the-badge&logo=ethereum&logoColor=white)

[![Python](https://img.shields.io/badge/Python-3.12+-3776ab?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.0-363636?style=flat-square&logo=solidity&logoColor=white)](https://soliditylang.org)
[![Flask](https://img.shields.io/badge/Flask-3.0+-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![Web3](https://img.shields.io/badge/Web3.py-6.0+-f68d1e?style=flat-square&logo=web3.js&logoColor=white)](https://web3py.readthedocs.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**A 7-Layer Convergent Architecture for Real-Time Cross-Border Settlements**

*Collapsing T+5 settlement cycles to under 10 seconds using blockchain, explainable AI/ML fraud detection, and Zero Trust security.*

[Quick Start](#-quick-start) · [Architecture](#-architecture) · [Features](#-features) · [API Reference](#-api-reference) · [User Guide](#-user-guide)

</div>

---

## Team — Group 9

| Name | Role |
|------|------|
| **Mohamad Idriss** | Lead Architect & Full-Stack Engineer |
| **Rohit Jacob Isaac** | Blockchain & Smart Contract Engineer |
| **Sriram Acharya Mudumbai** | AI/ML & Data Science Engineer |
| **Walid Elmahdy** | Compliance & Security Engineer |
| **Vibin Chandrabose** | Frontend & Integration Engineer |

---

## Overview

IPTS is an enterprise-grade payment transformation platform that demonstrates how modern fintech infrastructure can achieve near-instant cross-border settlements while maintaining regulatory compliance (AML/KYC/GDPR) and institutional-grade security.

The system integrates:
- **Ethereum Smart Contracts** — 7 Solidity contracts for atomic T+0 settlement with immutable audit trails
- **5 AI/ML Models** — Isolation Forest, Random Forest, XGBoost, Autoencoder, and Sequence Detector with a 16-feature vector including real-time velocity tracking
- **SHAP Explainability** — Per-transaction explainable AI using TreeExplainer with RF fallback, providing 16-feature contribution breakdowns
- **Four-Eyes Dual Approval** — Two independent compliance officers required for transactions >= $100K
- **Multi-Currency FX Engine** — 13 currencies with live rates, FX preview, and AML jurisdiction warnings
- **Zero Trust Architecture** — JWT-based session management with RBAC and rate limiting
- **GDPR-Compliant Data Sovereignty** — Off-chain PII vaulting with on-chain hash anchoring
- **SLA Tracking** — Severity-based countdown timers (Critical 4h, High 24h, Medium 72h, Low 7d)
- **Health Monitoring** — 30-second polling of all system components with visual status indicator
- **Real-Time Dashboard** — SSE-powered live telemetry with 7 functional tabs

---

## Table of Contents

- [Architecture](#-architecture)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [User Accounts](#-user-accounts)
- [User Guide](#-user-guide)
- [API Reference](#-api-reference)
- [AML Risk Engine](#-aml-risk-engine)
- [AI/ML Models](#-aiml-models)
- [Smart Contracts](#-smart-contracts)
- [Security](#-security)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## Architecture

IPTS implements a **7-Layer Convergent Architecture**, where each layer handles a specific domain concern:

```
+-------------------------------------------------------------+
|  LAYER 1 - Presentation & Integration                       |
|  SPA (Tailwind CSS, Chart.js, D3.js), SSE Dashboard         |
|  Multi-Currency Forms, SHAP Charts, SLA Tracking, Health     |
+-------------------------------------------------------------+
|  LAYER 2 - Zero Trust Security Perimeter                    |
|  JWT HS256 Auth, Rate Limiting, RBAC (5 roles)              |
|  Four-Eyes Dual Approval, Security Headers, CORS            |
+-------------------------------------------------------------+
|  LAYER 3 - Cognitive Intelligence (AI/ML)                   |
|  5-Model Ensemble: IF, RF, XGB, AE, Sequence Detector      |
|  16-Feature Vector, VelocityTracker, SHAP Explainability    |
|  NLP Watchlist Screening, Graph Centrality Analysis          |
+-------------------------------------------------------------+
|  LAYER 4 - Compliance & Regulatory Engine                   |
|  AML/KYC Screening, HITL Triage with SLA, Case Management  |
|  SAR Filing, Sanctions List, SWIFT GPI, FX Engine           |
+-------------------------------------------------------------+
|  LAYER 5 - Settlement & Blockchain Core                     |
|  7 Ethereum Smart Contracts (Solidity ^0.8.0)               |
|  Atomic Swaps, Nostro/Vostro, Multi-Sig, Compliance Oracle  |
+-------------------------------------------------------------+
|  LAYER 6 - Data Sovereignty & Privacy                       |
|  SQLite Off-Chain Vault (9 tables), GDPR Right to Erasure   |
|  PII Encryption, Keccak256 Hash Anchoring                   |
|  Four-Eyes Approvals Table, ISO 20022 Payload Separation    |
+-------------------------------------------------------------+
|  LAYER 7 - Infrastructure & Orchestration                   |
|  Ganache Blockchain, Flask API Server, Health Monitoring     |
|  Local macOS + Google Colab Deployment, ML Training Pipeline |
+-------------------------------------------------------------+
```

### Architecture Diagrams

Architecture SVG diagrams are available in [`docs/architecture/`](docs/architecture/):

| Diagram | Description |
|---------|------------|
| `ipts_seven_layer_convergent_architecture.svg` | Complete 7-layer system overview |
| `ipts_layer1_integration_architecture.svg` | Frontend integration layer |
| `ipts_layer1_interaction_architecture.svg` | User interaction flows |
| `ipts_layer2_security_architecture.svg` | Zero Trust security perimeter |
| `ipts_layer6_data_architecture.svg` | Data sovereignty & privacy layer |
| `ipts_layer7_infrastructure_architecture.svg` | Infrastructure orchestration |

---

## Features

### Payment Settlement
- **T+0 Atomic Settlement** — Cross-border payments settle in < 10 seconds via Ethereum smart contracts
- **Multi-Currency FX Engine** — 13 currencies (USD, EUR, GBP, JPY, CHF, AUD, CAD, CNY, INR, SGD, AED, SAR, BRL) with live rates and FX preview
- **AML Jurisdiction Warnings** — Automatic alerts for high-risk currencies (CNY, INR, BRL, AED, SAR)
- **Nostro Liquidity Management** — Real-time liquidity tracking in USD with ETH blockchain backing
- **SWIFT GPI Tracking** — UETR-based payment tracking compatible with SWIFT gpi standards
- **Balance Management** — Real user accounts with balance tracking, debit/credit on settlement

### AI/ML Fraud Detection
- **5-Model Ensemble** — Isolation Forest, Random Forest, XGBoost, Autoencoder, and Sequence Detector
- **16-Feature Vector** — 8 static transaction features + 8 real-time velocity features from VelocityTracker
- **SHAP Explainability** — Per-transaction TreeExplainer (XGBoost) with RF feature_importances_ fallback
- **Real-Time Velocity Tracking** — Per-sender sliding windows for 1h/24h/7d volume, average amount, z-score, unique receivers
- **Real-Time Scoring** — Sub-second risk assessment on every transaction
- **Automated AML Blocking** — Transactions over $100,000 are automatically flagged for AML review
- **Watchlist Screening** — NLP-based beneficiary name matching against sanctions databases
- **Graph Analytics** — PageRank centrality analysis to detect money laundering networks
- **Model Retraining** — On-demand retraining with fresh synthetic data on all 5 models

### Compliance & Regulation
- **Four-Eyes Dual Approval** — Transactions >= $100K require two independent compliance officer approvals
- **Human-in-the-Loop (HITL)** — Blocked transactions routed to compliance officers with four-eyes badges
- **SLA Tracking** — Severity-based countdown timers (Critical 4h, High 24h, Medium 72h, Low 7d)
- **Case Management** — Full lifecycle case tracking (open -> investigating -> escalated -> resolved)
- **SAR Filing** — Suspicious Activity Report generation with case linkage
- **Sanctions Database** — Maintainable sanctions list with entity screening
- **Audit Trail** — Immutable audit log of all system actions

### Security
- **Zero Trust Architecture** — Every request authenticated and authorized via JWT
- **Role-Based Access Control (RBAC)** — 5 distinct roles with granular permissions
- **GDPR Compliance** — Right to erasure, PII vaulting, data minimization
- **Hash Anchoring** — Only SHA-256 hashes stored on-chain; raw PII stays off-chain
- **Security Headers** — HSTS, X-Frame-Options, XSS Protection, Content-Type sniffing prevention
- **Rate Limiting** — Per-IP request throttling (100 req/min)

### Dashboard & UI
- **Health Monitoring** — /api/health polled every 30 seconds with green/yellow/red status dot
- **7-Tab Interface** — Dashboard, Payments, AI/ML, Network Graph, Admin, Compliance, Case Management
- **SHAP Visualization** — Inline feature contributions + horizontal bar chart in AI/ML tab
- **FX Converter** — Standalone currency conversion tool in Compliance tab
- **Professional Dark Theme** — Fintech-grade UI with Tailwind CSS
- **Interactive Charts** — Chart.js for volume analytics, D3.js for network visualization
- **Risk Visualization** — Color-coded risk scores, breakdown bars, and status indicators

---

## Quick Start

### Local macOS (Recommended)

**Prerequisites:** Python 3.12, Node.js 18+, npm

```bash
# Clone the repository
git clone https://github.com/mohamad-idriss/IPTS.git
cd IPTS

# Run the local deployment script
bash run_local.sh
```

The script automatically:
1. Creates a Python 3.12 virtual environment
2. Installs all Python and Node.js dependencies
3. Patches the deployment script for local execution (port 5001)
4. Starts Ganache, trains 5 ML models on 16 features, compiles 7 contracts
5. Launches Flask API server at **http://127.0.0.1:5001**

> **Note:** Port 5001 is used because macOS AirPlay uses port 5000.

### Google Colab

```python
# Cell 1: Upload files
from google.colab import files
uploaded = files.upload()  # Select ipts_colab_deploy.py and ipts_frontend.html

# Cell 2: Install Node.js
!curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
!sudo apt-get install -y nodejs

# Cell 3: Launch IPTS
!python ipts_colab_deploy.py
```

### Total Boot Time: ~90-120 seconds

---

## Installation

### Prerequisites

- Python 3.12+ (3.14 not supported due to ast.Num removal)
- Node.js 18+
- npm 9+

### Dependencies

| Category | Package | Version | Purpose |
|----------|---------|---------|---------|
| Web | Flask | 3.0+ | REST API framework |
| Blockchain | Web3.py | 6.15+ | Ethereum interaction |
| Blockchain | py-solc-x | 2.0+ | Solidity compiler |
| Auth | PyJWT | 2.8+ | JWT token management |
| ML | scikit-learn | 1.4+ | Isolation Forest, Random Forest |
| ML | XGBoost | 2.0+ | Gradient boosting classifier |
| ML | SHAP | 0.44+ | SHAP TreeExplainer |
| ML | imbalanced-learn | 0.12+ | SMOTE oversampling |
| Graph | NetworkX | 3.2+ | Graph analytics, PageRank |
| Crypto | cryptography | 42.0+ | Encryption utilities |
| Data | numpy, pandas | latest | Numerical and data processing |
| Infra | Ganache | 7.0+ | Local Ethereum blockchain |

---

## User Accounts

| Username | Password | Role | Balance (USD) | Permissions |
|----------|----------|------|---------------|-------------|
| `mohamad` | `Mohamad@2026!` | **Admin** | $1,000,000 | Full access to all features |
| `rohit` | `Rohit@2026!` | **Operator** | $750,000 | Settlements, Dashboard |
| `sriram` | `Sriram@2026!` | **Auditor** | $500,000 | Read-only access to all data |
| `walid` | `Walid@2026!` | **Compliance** | $350,000 | HITL review, Case management |
| `vibin` | `Vibin@2026!` | **Data Scientist** | $150,000 | AI/ML metrics, Retraining |

### Role Permissions Matrix

| Feature | Admin | Operator | Auditor | Compliance | Data Scientist |
|---------|:-----:|:--------:|:-------:|:----------:|:--------------:|
| Dashboard | Y | Y | Y | Y | Y |
| Execute Payments | Y | Y | - | - | - |
| View Transactions | Y | Y | Y | Y | Y |
| HITL Approve/Reject | Y | - | - | Y | - |
| Four-Eyes Approval | Y | - | - | Y | - |
| Case Management | Y | - | Y | Y | - |
| Retrain Models | Y | - | - | - | Y |
| GDPR Erasure | Y | - | - | Y | - |
| Sanctions Mgmt. | Y | - | - | Y | - |
| Audit Logs | Y | - | Y | Y | - |
| FX Converter | Y | Y | Y | Y | Y |

---

## User Guide

### Tab 1: Dashboard
- **KPI Cards** — Total Settlements, Blocked, Flagged, Nostro Liquidity
- **Settlement Volume Chart** — Real-time settlement activity visualization
- **AML Telemetry Table** — Live ledger with sender, beneficiary, amount, risk score, status
- **Health Status Dot** — Green/yellow/red indicator polled every 30 seconds

### Tab 2: Payments
- **Multi-Currency Support** — Select from 13 currencies with FX preview
- **AML Jurisdiction Warnings** — Automatic alerts for high-risk currencies
- **SHAP Feature Contributions** — Inline display of 16-feature contribution breakdown after settlement
- **Risk Score Breakdown** — Visual bars for Rules, ML, NLP, and Graph components

### Tab 3: AI/ML
- **5 Model Cards** — Isolation Forest, Random Forest, XGBoost, Autoencoder, Sequence Detector
- **SHAP Explainability Chart** — Horizontal bar chart showing feature impact on risk score
- **Feature Importance** — Relative contribution of each of the 16 features
- **Model Retraining** — Admin and Data Scientist roles can trigger on-demand retraining

### Tab 4: Network Graph
- Interactive D3.js force-directed graph with PageRank-sized nodes, color-coded communities, and cycle highlighting

### Tab 5: Admin
- **HITL Queue** — Four-eyes approval badges (Required/1 of 2/2 of 2), approve/reject controls
- **Audit Log** — Complete trail of all system actions
- **GDPR Erasure** — Right to erasure compliance tool

### Tab 6: Compliance
- **Sanctions Management** — Add/remove entities from screening list
- **SWIFT GPI Tracking** — Search transactions by UETR
- **FX Converter** — Multi-currency conversion tool (13 currencies)
- **Nostro Position** — Current liquidity positions

### Tab 7: Case Management
- **SLA Countdown** — Color-coded timers per case (Critical 4h, High 24h, Medium 72h, Low 7d)
- **Summary Cards** — Open, Investigating, Escalated, Resolved counts
- **Case Actions** — Investigate, Escalate, Resolve, Assign, Add Findings, File SAR
- **Case Types** — AML, Sanctions, Fraud, Structuring, PEP, Terrorist Financing

---

## API Reference

All endpoints (except `/api/login`) require JWT authentication via `Authorization: Bearer <token>`.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Authenticate and receive JWT token |

### Account Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts/me` | Current user's account info and balance |
| GET | `/api/accounts/beneficiaries` | List available beneficiaries |

### Settlements

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/settlement` | Execute settlement (returns shap_values) |
| GET | `/api/transactions` | List transactions (paginated) |
| GET | `/api/dashboard` | Real-time dashboard metrics |

### HITL Review

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hitl/queue` | List HITL items (includes four_eyes_status) |
| POST | `/api/hitl/approve/<id>` | Approve (four-eyes enforced for >= $100K) |
| POST | `/api/hitl/reject/<id>` | Reject blocked transaction |

### Compliance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/compliance/cases` | List cases (filterable) |
| GET | `/api/compliance/cases/<id>` | Case details with SLA status |
| POST | `/api/compliance/cases` | Create new case |
| PUT | `/api/compliance/cases/<id>` | Update case |
| POST | `/api/compliance/cases/<id>/escalate` | Escalate case |
| POST | `/api/compliance/cases/<id>/file-sar` | File SAR |
| GET | `/api/compliance/sanctions` | List sanctions |
| POST | `/api/compliance/sanctions` | Add to sanctions list |
| GET | `/api/compliance/swift-gpi/<uetr>` | Track SWIFT payment |

### AI/ML & System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models/metrics` | Model performance for all 5 models |
| POST | `/api/models/retrain` | Trigger retraining (admin/datascientist) |
| GET | `/api/network/graph` | Transaction graph data |
| GET | `/api/shap/test` | Debug: test SHAP computation |
| GET | `/api/fx/rates` | Live FX rates (13 currencies) |
| GET | `/api/health` | System health status |
| GET | `/api/audit/log` | Audit trail entries |
| POST | `/api/gdpr/erasure` | GDPR right to erasure |
| GET | `/api/stream` | SSE real-time event stream |

---

## AML Risk Engine

### Scoring Components

| Component | Weight | Method |
|-----------|--------|--------|
| Rule-Based | 30% | Deterministic threshold checks |
| ML Ensemble | 40% | 5-model weighted average |
| NLP Watchlist | 15% | Fuzzy entity matching + sanctions DB |
| Graph Risk | 15% | PageRank centrality analysis |

### Force-Override Triggers

| Condition | Forced Score | Result |
|-----------|-------------|--------|
| Amount > $500,000 | 95+ | **BLOCKED** |
| Amount > $100,000 | 85+ | **BLOCKED** + Four-Eyes Required |
| Watchlist/Sanctions match | 95+ | **BLOCKED** |
| Structuring + high frequency | 85+ | **BLOCKED** |
| High value + high-risk country | 85+ | **BLOCKED** |
| Any component score >= 90 | min 80 | **BLOCKED** |

### Decision Thresholds

| Composite Score | Decision | Action |
|----------------|----------|--------|
| >= 80 | **Blocked** | HITL queue + compliance case + four-eyes if >= $100K |
| >= 60 | **Flagged** | Settled but logged for review |
| < 60 | **Approved** | Settled normally |

---

## AI/ML Models

### 5-Model Ensemble

| Model | Type | Purpose | Configuration |
|-------|------|---------|---------------|
| Isolation Forest | Unsupervised | Anomaly detection | 100 estimators, 3% contamination |
| Random Forest | Supervised | Classification + SHAP fallback | 200 estimators, SMOTE-resampled |
| XGBoost | Supervised | Primary classifier + SHAP source | 300 estimators, class-weighted |
| Autoencoder | Semi-supervised | Reconstruction error anomaly | 64-32-16-32-64 MLP, 97th pctl threshold |
| Sequence Detector | Pattern-based | Temporal pattern detection | Sliding window, velocity rules |

### 16-Feature Vector

| # | Feature | Type | Description |
|---|---------|------|-------------|
| 1 | amount | Static | Transaction value in USD |
| 2 | hour | Static | Hour of day (0-23) |
| 3 | day_of_week | Static | Day of week (0-6) |
| 4 | freq_7d | Static | Sender's 7-day transaction count |
| 5 | is_round | Static | Round number flag |
| 6 | country_risk | Static | Recipient jurisdiction risk (0-1) |
| 7 | sender_id | Static | Sender hash |
| 8 | receiver_id | Static | Receiver hash |
| 9 | velocity_1h | Real-time | USD sent in last 1 hour |
| 10 | velocity_24h | Real-time | USD sent in last 24 hours |
| 11 | velocity_7d | Real-time | USD sent in last 7 days |
| 12 | avg_tx_amount | Real-time | Running average amount |
| 13 | std_tx_amount | Real-time | Amount standard deviation |
| 14 | amount_zscore | Real-time | Z-score vs historical mean |
| 15 | unique_receivers_7d | Real-time | Unique receivers in 7 days |
| 16 | is_new_receiver | Real-time | First-time receiver flag |

### SHAP Explainability

Every transaction returns per-feature SHAP contribution scores:
- **Primary:** `shap.TreeExplainer(xgb_clf)` computes exact Shapley values
- **Fallback:** RF `feature_importances_` * deviations from population means
- **Display:** Inline in settlement result + horizontal bar chart in AI/ML tab

---

## Smart Contracts

Seven Solidity contracts are compiled and deployed to the local Ganache blockchain:

| Contract | Purpose |
|----------|---------|
| `IPTS_Enterprise_Settlement` | Primary: injectLiquidity, executeAtomicSwap, getNostroBalance |
| `ComplianceOracle` | On-chain risk score storage and compliance checks |
| `MultiSigApproval` | Multi-signature approval for high-value settlements |
| `AuditTrail` | Immutable on-chain audit event logging |
| `NostroVostro` | Nostro/Vostro account balance management |
| `CrossBorderBridge` | Cross-border settlement bridge |
| `FeeManager` | Fee calculation and distribution |

---

## Security

### Zero Trust Implementation

- **No implicit trust** — Every API request requires a valid JWT
- **Four-Eyes Dual Approval** — Transactions >= $100K need two independent approvers
- **Short-lived tokens** — 1-hour expiry with HS256 signing
- **Rate limiting** — 100 requests per minute per IP
- **Security headers** — HSTS, X-Frame-Options: DENY, X-XSS-Protection, X-Content-Type-Options: nosniff
- **CORS policy** — Configurable allowed origins

### GDPR Compliance

- **Data Minimization** — Only hashes stored on blockchain; raw PII in off-chain vault
- **Right to Erasure** — API endpoint to anonymize/delete PII on request
- **Consent Tracking** — GDPR consent flag on all PII records
- **Hash Anchoring** — SHA-256 hash of ISO 20022 payloads anchored to smart contract

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, Tailwind CSS, Chart.js, D3.js, Font Awesome |
| API | Python Flask, JWT, SSE |
| Blockchain | Solidity ^0.8.0, Web3.py, Ganache, py-solc-x |
| AI/ML | scikit-learn, XGBoost, SHAP, imbalanced-learn, NetworkX |
| Database | SQLite (off-chain vault, 9 tables) |
| Security | JWT HS256, RBAC, Four-Eyes, HSTS, Rate Limiting |
| Infrastructure | Local macOS (run_local.sh) or Google Colab |

---

## Project Structure

```
IPTS/
├── README.md                           # This file
├── LICENSE                             # MIT License
├── requirements.txt                    # Python dependencies
├── run_local.sh                        # Local macOS deployment script
├── .gitignore                          # Git ignore rules
│
├── src/
│   └── ipts_colab_deploy.py           # Main deployment script (3,100+ lines)
│                                       #   Phase 0: Environment cleanup
│                                       #   Phase 1: Dependency installation
│                                       #   Phase 2: Directory structure
│                                       #   Phase 3: ML model training (5 models, 16 features)
│                                       #   Phase 4: Solidity contract compilation (7 contracts)
│                                       #   Phase 5: Frontend deployment
│                                       #   Phase 6: Flask backend (SHAP, four-eyes, FX, health)
│                                       #   Phase 7: Service orchestration
│                                       #   Phase 8: Status reporting
│
├── templates/
│   └── ipts_frontend.html              # Single-page frontend (1,600+ lines)
│
├── docs/
│   ├── generate_report.js              # Technical report DOCX generator
│   ├── generate_briefing.js            # Executive briefing DOCX generator
│   ├── IPTS_Technical_Report.docx      # Generated technical report
│   ├── G9-IPTS_Executive_Briefing.docx # Generated executive briefing
│   ├── architecture/                   # Architecture diagrams (SVG + PNG)
│   └── screenshots/                    # UI screenshots
│
├── contracts/                          # Compiled contract artifacts (generated)
├── models/                             # Trained ML models (generated)
├── logs/                               # Application logs (generated)
└── tests/                              # Test suite
```

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Python 3.14 errors | Use Python 3.12 (3.14 removed ast.Num, breaking scikit-learn) |
| Port 5000 blocked on macOS | run_local.sh uses port 5001 (AirPlay uses 5000) |
| Ganache not reachable | Re-run the script. Ganache sometimes needs extra startup time. |
| Frontend shows placeholder | Ensure ipts_frontend.html is in templates/ directory |
| SHAP not showing results | Verify models trained on 16 features (check /api/shap/test) |
| Four-eyes approving with one person | Verify four_eyes_approvals table column index (fe_record[7]) |
| Port already in use | `kill -9 $(lsof -ti:8545) 2>/dev/null; kill -9 $(lsof -ti:5001) 2>/dev/null` |
| Import errors | `pip install web3 py-solc-x flask pyjwt scikit-learn xgboost shap imbalanced-learn networkx` |

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Author

**Mohamad Idriss**

---

<div align="center">
<sub>Built with blockchain, explainable AI, and a commitment to secure, instant financial infrastructure.</sub>
</div>
