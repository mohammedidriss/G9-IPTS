# G9-IPTS — Integrated Payment Transformation System

<div align="center">

![IPTS Banner](https://img.shields.io/badge/G9--IPTS-Enterprise%20Settlement%20Platform-10b981?style=for-the-badge&logo=ethereum&logoColor=white)

[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.0-363636?style=flat-square&logo=solidity&logoColor=white)](https://soliditylang.org)
[![Flask](https://img.shields.io/badge/Flask-3.0+-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![Web3](https://img.shields.io/badge/Web3.py-6.0+-f68d1e?style=flat-square&logo=web3.js&logoColor=white)](https://web3py.readthedocs.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**A 7-Layer Convergent Architecture for Real-Time Cross-Border Settlements**

*Collapsing T+5 settlement cycles to under 10 seconds using blockchain, AI/ML fraud detection, and Zero Trust security.*

[Quick Start](#-quick-start) · [Architecture](#-architecture) · [Features](#-features) · [API Reference](#-api-reference) · [User Guide](#-user-guide)

</div>

---

## 👥 Team — Group 9

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
- **Ethereum Smart Contracts** for atomic T+0 settlement with immutable audit trails
- **4 AI/ML Models** for real-time fraud detection and AML screening
- **Zero Trust Architecture** with JWT-based session management
- **GDPR-Compliant Data Sovereignty** with off-chain PII vaulting and on-chain hash anchoring
- **Compliance Case Management** with automated SAR filing workflows
- **Real-Time Dashboard** with SSE-powered live telemetry

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
- [Smart Contracts](#-smart-contracts)
- [Security](#-security)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🏗 Architecture

IPTS implements a **7-Layer Convergent Architecture**, where each layer handles a specific domain concern:

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — Presentation & Integration                          │
│  Single-Page Application (Tailwind CSS, Chart.js, D3.js)       │
│  Real-time SSE Dashboard, Payment Forms, Case Management       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2 — Zero Trust Security Perimeter                       │
│  JWT HS256 Auth, Rate Limiting, RBAC, Security Headers         │
│  CORS Policy, HSTS, XSS Protection, Content-Type Sniffing     │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3 — Cognitive Intelligence (AI/ML)                      │
│  Isolation Forest, Random Forest, XGBoost, Autoencoder         │
│  NLP Watchlist Screening, Graph Centrality Analysis            │
│  SMOTE Resampling, 4-Model Ensemble Scoring                   │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4 — Compliance & Regulatory Engine                      │
│  AML/KYC Screening, HITL Triage, Case Management              │
│  SAR Filing, Sanctions List, SWIFT GPI Tracking                │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 5 — Settlement & Blockchain Core                        │
│  Ethereum Smart Contracts (Solidity ^0.8.0)                    │
│  Atomic Swaps, Nostro/Vostro Liquidity Management              │
│  Multi-Sig Approval, Compliance Oracle                         │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 6 — Data Sovereignty & Privacy                          │
│  SQLite Off-Chain Vault, GDPR Right to Erasure                 │
│  PII Encryption, Keccak256 Hash Anchoring                      │
│  ISO 20022 Payload Separation                                  │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 7 — Infrastructure & Orchestration                      │
│  Ganache Local Blockchain, Flask API Server                    │
│  Localtunnel Public Exposure, Process Management               │
│  Automated ML Training Pipeline, Contract Compilation          │
└─────────────────────────────────────────────────────────────────┘
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

## ✨ Features

### Payment Settlement
- **T+0 Atomic Settlement** — Cross-border payments settle in < 10 seconds via Ethereum smart contracts
- **Nostro Liquidity Management** — Real-time liquidity tracking in USD with ETH blockchain backing
- **SWIFT GPI Tracking** — UETR-based payment tracking compatible with SWIFT gpi standards
- **Multi-Currency Support** — USD-denominated with automatic ETH conversion at market rates
- **Balance Management** — Real user accounts with balance tracking, debit/credit on settlement

### AI/ML Fraud Detection
- **4-Model Ensemble** — Isolation Forest, Random Forest, XGBoost, and Autoencoder
- **Real-Time Scoring** — Sub-second risk assessment on every transaction
- **Automated AML Blocking** — Transactions over $100,000 are automatically flagged for AML review
- **Watchlist Screening** — NLP-based beneficiary name matching against sanctions databases
- **Graph Analytics** — PageRank centrality analysis to detect money laundering networks
- **Model Retraining** — On-demand model retraining with fresh synthetic data

### Compliance & Regulation
- **Human-in-the-Loop (HITL)** — Blocked transactions routed to compliance officers for manual review
- **Case Management** — Full lifecycle case tracking (open → investigating → escalated → resolved)
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
- **Real-Time Telemetry** — Server-Sent Events (SSE) for live transaction monitoring
- **7-Tab Interface** — Dashboard, Payments, AI/ML, Network Graph, Admin, Compliance, Case Management
- **Professional Dark Theme** — Fintech-grade UI with Tailwind CSS
- **Interactive Charts** — Chart.js for volume analytics, D3.js for network visualization
- **Risk Visualization** — Color-coded risk scores, breakdown bars, and status indicators

---

## 🚀 Quick Start

### Google Colab (Recommended for Demo)

**1. Open Google Colab**
Go to [colab.research.google.com](https://colab.research.google.com) and create a new notebook.

**2. Upload files** — In the first cell:
```python
from google.colab import files
uploaded = files.upload()  # Select both files when prompted
```
Upload:
- `src/ipts_colab_deploy.py`
- `templates/ipts_frontend.html`

**3. Install Node.js** — In a new cell:
```python
!curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
!sudo apt-get install -y nodejs
```

**4. Launch IPTS** — In a new cell:
```python
!python ipts_colab_deploy.py
```

**5. Access the system** — Click the Localtunnel URL printed in the output.

### Total Boot Time: ~90-120 seconds

The script automatically:
1. Kills stale processes on ports 8545/5000
2. Installs all Python/Node.js dependencies
3. Generates 15,000 synthetic transactions
4. Trains 4 ML models (Isolation Forest, Random Forest, XGBoost, Autoencoder)
5. Compiles 5 Solidity smart contracts
6. Deploys contracts to local Ganache blockchain
7. Starts Flask API server with Zero Trust auth
8. Exposes the system via Localtunnel

---

## 📦 Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm 9+

### Local Installation

```bash
# Clone the repository
git clone https://github.com/mohamad-idriss/IPTS.git
cd IPTS

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies
npm install -g ganache localtunnel

# Run the system
python src/ipts_colab_deploy.py
```

### Dependencies

| Category | Package | Version | Purpose |
|----------|---------|---------|---------|
| Web | Flask | 3.0+ | REST API framework |
| Blockchain | Web3.py | 6.0+ | Ethereum interaction |
| Blockchain | py-solc-x | 2.0+ | Solidity compiler |
| Auth | PyJWT | 2.8+ | JWT token management |
| ML | scikit-learn | 1.3+ | Isolation Forest, Random Forest |
| ML | XGBoost | 2.0+ | Gradient boosting classifier |
| ML | imbalanced-learn | 0.11+ | SMOTE oversampling |
| Graph | NetworkX | 3.1+ | Graph analytics, PageRank |
| Crypto | cryptography | 41.0+ | Encryption utilities |
| Infra | Ganache | 7.0+ | Local Ethereum blockchain |
| Infra | Localtunnel | latest | Public URL tunneling |

---

## 👥 User Accounts

The system comes pre-configured with 5 user accounts, each with different roles and starting balances:

| Username | Password | Role | Balance (USD) | Permissions |
|----------|----------|------|---------------|-------------|
| `mohamad` | `Mohamad@2026!` | **Admin** | $1,000,000 | Full access to all features, model retraining |
| `rohit` | `Rohit@2026!` | **Operator** | $750,000 | Settlements, Dashboard, Payment execution |
| `sriram` | `Sriram@2026!` | **Auditor** | $500,000 | Read-only access to all data and audit logs |
| `walid` | `Walid@2026!` | **Compliance** | $350,000 | Compliance cases, HITL review, GDPR erasure |
| `vibin` | `Vibin@2026!` | **Data Scientist** | $150,000 | AI/ML metrics, Model retraining |

### Role Permissions Matrix

| Feature | Admin | Operator | Auditor | Compliance | Data Scientist |
|---------|:-----:|:--------:|:-------:|:----------:|:--------------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Execute Payments | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Transactions | ✅ | ✅ | ✅ | ✅ | ✅ |
| HITL Approve/Reject | ✅ | ❌ | ❌ | ✅ | ❌ |
| Case Management | ✅ | ❌ | ✅ | ✅ | ❌ |
| Retrain Models | ✅ | ❌ | ❌ | ❌ | ✅ |
| GDPR Erasure | ✅ | ❌ | ❌ | ✅ | ❌ |
| Sanctions Management | ✅ | ❌ | ❌ | ✅ | ❌ |
| Audit Logs | ✅ | ❌ | ✅ | ✅ | ❌ |

---

## 📖 User Guide

### Tab 1: Dashboard

The main dashboard provides real-time KPI cards and a live transaction ledger:

- **Total Settlements** — Count of all processed transactions
- **Blocked** — Transactions stopped by AML engine (shown in red)
- **Flagged** — Transactions that passed but with elevated risk (yellow)
- **Nostro Liquidity** — Available liquidity in USD
- **Settlement Volume Chart** — Real-time chart of settlement activity
- **AML Telemetry Table** — Live ledger showing sender, beneficiary, amount, risk score, and status with color coding

### Tab 2: Payments

Execute cross-border settlements:

1. Your **sender identity** and **available balance** are displayed automatically
2. Select a **beneficiary** from the dropdown (includes both legitimate and test suspicious entities)
3. Enter the **amount in USD**
4. Click **Execute Settlement**
5. The system runs the transaction through the AML Risk Engine:
   - If approved → settles on blockchain, balance deducted
   - If flagged → settles but logged for review
   - If blocked → no balance change, compliance case auto-created

**AML Auto-Block Rules:**
| Trigger | Action |
|---------|--------|
| Amount > $100,000 | Auto-blocked (AML threshold) |
| Amount > $500,000 | Auto-blocked (critical alert) |
| Watchlist/Sanctions match | Auto-blocked (score 95+) |
| Structuring pattern ($9K-$9.9K) + high frequency | Auto-blocked |

### Tab 3: AI/ML

View the performance metrics of all 4 fraud detection models:

- **Isolation Forest** — Unsupervised anomaly detection
- **Random Forest** — Supervised classification with SMOTE resampling
- **XGBoost** — Gradient-boosted decision trees with class weighting
- **Autoencoder** — Neural network reconstruction error-based detection

Each model card shows F1 score, accuracy, and feature importance charts. Admin and Data Scientist roles can trigger on-demand **model retraining**.

### Tab 4: Network Graph

Interactive D3.js visualization of the transaction network:

- Nodes represent entities (senders/receivers)
- Node size reflects PageRank centrality
- Edges represent transaction flows
- Color-coded by community membership
- Highlights potential laundering ring cycles

### Tab 5: Admin

System administration panel:

- **HITL Queue** — Review blocked transactions, approve or reject with audit logging
- **Audit Log** — Complete trail of all system actions (logins, settlements, approvals)
- **GDPR Erasure** — Right to erasure compliance for PII data

### Tab 6: Compliance

Regulatory compliance tools:

- **Sanctions Management** — Add/remove entities from the sanctions screening list
- **SWIFT GPI Tracking** — Search transactions by UETR reference
- **Nostro Position** — View current liquidity positions

### Tab 7: Case Management

Full compliance case lifecycle management:

- **Summary Cards** — Open, Investigating, Escalated, and Resolved case counts
- **Case Table** — Filterable by status, severity, and case type
- **Case Actions** — Investigate, Escalate, Resolve, Assign, Add Findings, File SAR
- **Case Types** — AML, Sanctions, Fraud, Structuring, PEP, Terrorist Financing
- **Severity Levels** — Critical (red), High (orange), Medium (yellow), Low (green)

---

## 📡 API Reference

All endpoints (except `/api/login`) require JWT authentication via the `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Authenticate and receive JWT token |

**Request:**
```json
{ "username": "mohamad", "password": "Mohamad@2026!" }
```

**Response:**
```json
{
  "token": "eyJhbGciOi...",
  "username": "mohamad",
  "role": "admin",
  "full_name": "Mohamad Idriss",
  "expires_in": 3600
}
```

### Account Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts/me` | Current user's account info and balance |
| GET | `/api/accounts/beneficiaries` | List available beneficiaries |

### Settlements

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/settlement` | Execute a new settlement |
| GET | `/api/transactions` | List transactions (paginated) |
| GET | `/api/dashboard` | Real-time dashboard metrics |

**Settlement Request:**
```json
{
  "beneficiary_name": "Rohit Jacob Isaac",
  "amount": 50000,
  "currency": "USD",
  "receiver_username": "rohit"
}
```

**Settlement Response (Approved):**
```json
{
  "settlement_id": "uuid",
  "risk_score": 12.5,
  "risk_decision": "approved",
  "status": "settled",
  "tx_hash": "0x...",
  "settlement_time_ms": 847,
  "new_balance": 950000.0,
  "uetr": "uuid"
}
```

**Settlement Response (Blocked):**
```json
{
  "settlement_id": "uuid",
  "risk_score": 85.0,
  "risk_decision": "blocked",
  "status": "blocked",
  "case_number": "CASE-2026-0001",
  "message": "Transaction blocked. Compliance case CASE-2026-0001 created."
}
```

### HITL Review

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hitl/queue` | List all HITL items |
| POST | `/api/hitl/approve/<id>` | Approve blocked transaction |
| POST | `/api/hitl/reject/<id>` | Reject blocked transaction |

### Compliance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/compliance/cases` | List compliance cases (filterable) |
| GET | `/api/compliance/cases/<id>` | Get case details |
| POST | `/api/compliance/cases` | Create new case |
| PUT | `/api/compliance/cases/<id>` | Update case |
| POST | `/api/compliance/cases/<id>/escalate` | Escalate case |
| POST | `/api/compliance/cases/<id>/file-sar` | File Suspicious Activity Report |
| GET | `/api/compliance/sanctions` | List sanctions |
| POST | `/api/compliance/sanctions` | Add to sanctions list |
| GET | `/api/compliance/swift-gpi/<uetr>` | Track SWIFT payment |

### AI/ML

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models/metrics` | Model performance metrics |
| POST | `/api/models/retrain` | Trigger model retraining (admin/datascientist) |
| GET | `/api/network/graph` | Transaction graph data for visualization |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit/log` | Audit trail entries |
| POST | `/api/gdpr/erasure` | GDPR right to erasure |
| GET | `/api/stream` | SSE real-time event stream |

---

## 🤖 AML Risk Engine

The AML Risk Engine uses a **weighted 4-component scoring system** with force-override triggers:

### Scoring Components

| Component | Weight | Method |
|-----------|--------|--------|
| Rule-Based | 30% | Deterministic threshold checks |
| ML Ensemble | 40% | 4-model weighted average |
| NLP Watchlist | 15% | Fuzzy entity matching + sanctions DB |
| Graph Risk | 15% | PageRank centrality analysis |

### ML Models

| Model | Type | Purpose | Training |
|-------|------|---------|----------|
| Isolation Forest | Unsupervised | Anomaly detection | 15K samples, 3% contamination |
| Random Forest | Supervised | Binary classification | SMOTE-resampled, 200 estimators |
| XGBoost | Supervised | Gradient boosting | Class-weighted, 300 estimators |
| Autoencoder | Semi-supervised | Reconstruction error | Normal-only training, 97th percentile threshold |

### Force-Override Triggers

These bypass the weighted scoring and force specific outcomes:

| Condition | Forced Score | Result |
|-----------|-------------|--------|
| Amount > $500,000 | 95+ | **BLOCKED** |
| Amount > $100,000 | 85+ | **BLOCKED** |
| Watchlist/Sanctions match | 95+ | **BLOCKED** |
| Structuring + high frequency | 85+ | **BLOCKED** |
| High value + high-risk country | 85+ | **BLOCKED** |
| Any component score ≥ 90 | min 80 | **BLOCKED** |

### Decision Thresholds

| Composite Score | Decision | Action |
|----------------|----------|--------|
| ≥ 80 | **Blocked** | HITL queue + compliance case created |
| ≥ 60 | **Flagged** | Settled but logged for review |
| < 60 | **Approved** | Settled normally |

---

## ⛓ Smart Contracts

Five Solidity contracts are compiled and deployed to the local Ganache blockchain:

### IPTS_Enterprise_Settlement (Primary)

```solidity
// Core settlement contract
function injectLiquidity(address bank) external payable
function executeAtomicSwap(address receiver, bytes32 iso20022Hash, uint8 riskScore) external payable
function getNostroBalance(address bank) external view returns (uint256)
function getSettlement(bytes32 txHash) external view returns (Settlement)
```

### Supporting Contracts

| Contract | Purpose |
|----------|---------|
| `ComplianceOracle` | On-chain risk score storage and compliance checks |
| `MultiSigApproval` | Multi-signature approval for high-value settlements |
| `AuditTrail` | Immutable on-chain audit event logging |
| `NostroVostro` | Nostro/Vostro account balance management |

---

## 🔒 Security

### Zero Trust Implementation

- **No implicit trust** — Every API request requires a valid JWT
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

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, Tailwind CSS, Chart.js, D3.js, Font Awesome |
| API | Python Flask, JWT, SSE |
| Blockchain | Solidity ^0.8.0, Web3.py, Ganache, py-solc-x |
| AI/ML | scikit-learn, XGBoost, imbalanced-learn, NetworkX |
| Database | SQLite (off-chain vault) |
| Security | JWT HS256, RBAC, HSTS, Rate Limiting |
| Infrastructure | Localtunnel, subprocess orchestration |

---

## 📁 Project Structure

```
IPTS/
├── README.md                           # This file
├── LICENSE                             # MIT License
├── requirements.txt                    # Python dependencies
├── .gitignore                          # Git ignore rules
│
├── src/
│   └── ipts_colab_deploy.py           # Main deployment script (2,400+ lines)
│                                       #   Phase 0: Environment cleanup
│                                       #   Phase 1: Dependency installation
│                                       #   Phase 2: Directory structure
│                                       #   Phase 3: ML model training pipeline
│                                       #   Phase 4: Solidity contract compilation
│                                       #   Phase 5: Frontend deployment
│                                       #   Phase 6: Flask backend generation
│                                       #   Phase 7: Service orchestration
│                                       #   Phase 8: Status reporting
│
├── templates/
│   └── ipts_frontend.html              # Single-page frontend application (1,500+ lines)
│
├── docs/
│   ├── architecture/                   # Architecture diagrams (SVG)
│   │   ├── ipts_seven_layer_convergent_architecture.svg
│   │   ├── ipts_layer1_integration_architecture.svg
│   │   ├── ipts_layer1_interaction_architecture.svg
│   │   ├── ipts_layer2_security_architecture.svg
│   │   ├── ipts_layer6_data_architecture.svg
│   │   ├── ipts_layer7_infrastructure_architecture.svg
│   │   └── ipts_reference_architecture.html
│   └── screenshots/                    # UI screenshots
│
├── contracts/                          # Compiled contract artifacts (generated)
├── models/                             # Trained ML models (generated)
├── logs/                               # Application logs (generated)
└── tests/                              # Test suite
```

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|---------|
| Ganache not reachable | Re-run the script. Sometimes Ganache takes longer to start on Colab. |
| Localtunnel URL not showing | Run `!npx localtunnel --port 5000` in a new cell. |
| Colab disconnects after 30 min | Keep the browser tab active or use Colab Pro. |
| Port already in use | Run `!kill -9 $(lsof -ti:8545) 2>/dev/null; kill -9 $(lsof -ti:5000) 2>/dev/null` |
| Import errors | Run `!pip install web3 py-solc-x flask pyjwt scikit-learn xgboost imbalanced-learn networkx` |
| Stuck at "Building transaction graph" | This is the old version. Update to the latest `ipts_colab_deploy.py`. |

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Author

**Mohamad Idriss**

---

<div align="center">
<sub>Built with blockchain, AI, and a commitment to secure, instant financial infrastructure.</sub>
</div>
# Group-9-IPTS
# Group-9-IPTS
# Group-9-IPTS
# Group-9-IPTS
# G9-IPTS
