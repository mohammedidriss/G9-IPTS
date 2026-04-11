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
- **Real-Time Dashboard** — SSE-powered live telemetry with 13 functional tabs and Proof of Reserve indicator
- **Notification Center** — Real-time push notifications via SSE with bell badge and dropdown panel
- **Support Chat Bot (LLM)** — AI-powered chat using local Ollama/Llama 3.2 with user context injection
- **Virtual Card Services** — Generate, freeze, cancel, and provision Visa/MC cards to digital wallets
- **Spending 360 Analytics** — Comprehensive spending reports with charts, trends, and beneficiary rankings
- **E-KYC Verification** — Animated 3-phase identity verification with confidence scoring
- **DeFi Hub** — DEX/AMM with constant-product pricing across 6 liquidity pools, 3-tier yield staking (3.5-8.1% APY), and HTLC programmable escrow
- **7 Payment Channels** — Settlement, P2P, ACH/Wire/SEPA, Scheduled, QR Pay, AMM Swap, HTLC Escrow
- **Fraud Heatmap** — Global risk hotspot visualization with country-level analytics
- **SAR Auto-Generation** — Automated FinCEN-format Suspicious Activity Reports from compliance cases
- **ML Model Caching** — Models persist to disk; skip training on subsequent startups

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
|  SQLite Off-Chain Vault (17 tables), GDPR Right to Erasure  |
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
- **P2P Transfers** — Instant peer-to-peer payments by username, email, or phone number with real-time balance updates
- **ACH/Wire/SEPA Transfers** — External bank transfers with fee calculation, routing/sort codes, and processing time estimates
- **Scheduled Payments** — Recurring payment scheduling (daily, weekly, bi-weekly, monthly) with beneficiary and description fields
- **QR Code Payments** — Generate QR codes for receiving payments and scan/paste QR data to send instant payments
- **AML Jurisdiction Warnings** — Automatic alerts for high-risk currencies (CNY, INR, BRL, AED, SAR)
- **Nostro Liquidity Management** — Real-time liquidity tracking in USD with ETH blockchain backing
- **SWIFT GPI Tracking** — UETR-based payment tracking compatible with SWIFT gpi standards
- **Balance Management** — Real user accounts with balance tracking, debit/credit on settlement

### Account Management
- **Multi-Account System** — Auto-provisioned Checking, Savings, and Business sub-accounts with independent balances
- **Beneficiary Management** — Full CRUD for beneficiaries with account numbers, bank names, SWIFT codes, risk levels, and notes
- **Internal Transfers** — Move funds between sub-accounts (Checking, Savings, Business) instantly
- **Real-Time Ledger** — Paginated transaction history showing direction (debit/credit), counterparty, status, and running balance

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

### Card Services
- **Virtual Card Generation** — Issue Visa/Mastercard virtual cards with masked numbers, expiry, and hashed CVV
- **Card Controls** — Per-card spending limits, online/international/ATM toggles, and merchant category restrictions
- **Freeze/Unfreeze** — Instant card suspension and reactivation with status tracking
- **Digital Wallet Provisioning** — One-click provisioning to Apple Pay, Google Pay, and Samsung Pay
- **Card Cancellation** — Permanent card deactivation with confirmation flow

### Financial Tools
- **Spending 360 Analytics** — Comprehensive spending dashboard with KPI cards (Total Sent, Total Received, Avg Risk Score, Highest TX)
- **Monthly Spending Trend** — Dual-axis chart showing spending amount and transaction count by month
- **Risk Distribution** — Bar chart categorizing transactions by risk level (Low, Medium, High, Critical)
- **Currency Breakdown** — Doughnut chart showing spending distribution by currency
- **Activity Heatmap** — Bar chart showing transaction activity by hour of day
- **Top Beneficiaries** — Ranked table of most-transacted beneficiaries with counts, amounts, and risk scores

### DeFi Hub
- **DEX/AMM (Automated Market Maker)** — Constant-product (x·y=k) pricing across 6 liquidity pools (USD/EUR, GBP, JPY, CHF, AED, ETH) with 0.3% swap fee and price impact visualization
- **Yield Farming / Staking** — 3-tier system: Flexible (3.5% APY, no lock), 30-Day Lock (5.2% APY), 90-Day Lock (8.1% APY) with real-time yield accrual
- **HTLC Escrow** — Hash Time-Locked Contracts with SHA-256 hashlock, configurable timelock, and create/claim/refund lifecycle
- **Proof of Reserve** — Dashboard card showing off-chain vs on-chain reserve totals with 1:1 backing indicator
- **Fraud Heatmap** — Global risk hotspot visualization with country-level alert counts, average risk scores, and transaction volumes

### Compliance & Regulation
- **Four-Eyes Dual Approval** — Transactions >= $100K require two independent compliance officer approvals
- **Human-in-the-Loop (HITL)** — Blocked transactions routed to compliance officers with four-eyes badges
- **SLA Tracking** — Severity-based countdown timers (Critical 4h, High 24h, Medium 72h, Low 7d)
- **Case Management** — Full lifecycle case tracking (open -> investigating -> escalated -> resolved)
- **SAR Filing** — Suspicious Activity Report generation with case linkage
- **SAR Auto-Generation** — Automated FinCEN-format SAR report download (JSON) from compliance cases
- **Sanctions Database** — Maintainable sanctions list with entity screening
- **Audit Trail** — Immutable audit log of all system actions

### Security & Identity
- **Zero Trust Architecture** — Every request authenticated and authorized via JWT
- **E-KYC Verification** — 3-phase animated verification flow (document upload, AI processing, identity verified) with confidence scoring
- **Biometric Controls** — Toggles for Face ID, fingerprint authentication, and biometric payment authorization
- **Fraud Alert Monitoring** — Real-time fraud alert feed with severity levels and acknowledgment controls
- **Role-Based Access Control (RBAC)** — 5 distinct roles with granular permissions
- **GDPR Compliance** — Right to erasure, PII vaulting, data minimization
- **Hash Anchoring** — Only SHA-256 hashes stored on-chain; raw PII stays off-chain
- **Security Headers** — HSTS, X-Frame-Options, XSS Protection, Content-Type sniffing prevention
- **Rate Limiting** — Per-IP request throttling (100 req/min)

### Dashboard & UI
- **Health Monitoring** — /api/health polled every 30 seconds with green/yellow/red status dot
- **12-Tab Interface** — Dashboard, Payments, AI/ML, Network Graph, Admin, Compliance, Case Management, Beneficiaries, Spending 360, Cards, Security, Documents
- **Notification Center** — Real-time notification bell with badge count, dropdown panel, and mark-as-read functionality (SSE-powered)
- **Support Chat Widget** — Floating AI-powered chat bot with keyword-matching responses for account, payment, and security queries
- **Multi-Account Dashboard** — Sub-account cards (Checking, Savings, Business) with balances displayed on the Dashboard
- **Real-Time Ledger** — Live transaction feed on Dashboard showing debit/credit direction, counterparty, and status
- **Document Center** — Auto-generated monthly statements with download buttons and date filtering
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
uploaded = files.upload()  # Select IPTS_deploy.py and ipts_frontend.html

# Cell 2: Install Node.js
!curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
!sudo apt-get install -y nodejs

# Cell 3: Launch IPTS
!python IPTS_deploy.py
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
| P2P / ACH / Scheduled / QR | Y | Y | - | - | - |
| View Transactions | Y | Y | Y | Y | Y |
| Beneficiary Management | Y | Y | - | - | - |
| Spending 360 | Y | Y | Y | Y | Y |
| Virtual Cards | Y | Y | - | - | - |
| E-KYC / Security | Y | Y | Y | Y | Y |
| Documents | Y | Y | Y | Y | Y |
| HITL Approve/Reject | Y | - | - | Y | - |
| Four-Eyes Approval | Y | - | - | Y | - |
| Case Management | Y | - | Y | Y | - |
| Retrain Models | Y | - | - | - | Y |
| GDPR Erasure | Y | - | - | Y | - |
| Sanctions Mgmt. | Y | - | - | Y | - |
| Audit Logs | Y | - | Y | Y | - |
| FX Converter | Y | Y | Y | Y | Y |
| Notifications | Y | Y | Y | Y | Y |
| Support Chat | Y | Y | Y | Y | Y |

---

## User Guide

### Tab 1: Dashboard
- **KPI Cards** — Total Settlements, Blocked, Flagged, Nostro Liquidity
- **My Accounts** — Sub-account cards for Checking, Savings, and Business with live balances
- **Real-Time Ledger** — Latest 10 transactions with direction (debit/credit), counterparty, and status
- **FX Rates Ticker** — Live rates for all 13 supported currencies
- **Settlement Volume Chart** — Real-time settlement activity visualization
- **AML Telemetry Table** — Live ledger with sender, beneficiary, amount, risk score, status
- **Notification Bell** — Badge count with dropdown panel showing recent notifications
- **Health Status Dot** — Green/yellow/red indicator polled every 30 seconds

### Tab 2: Payments (5 Sub-Tabs)
- **Settlement** — Multi-currency settlement with FX preview, AML warnings, SHAP contributions, and risk breakdown
- **P2P Transfer** — Send money to other users by username, email, or phone with instant balance updates
- **ACH/Wire/SEPA** — External bank transfers with transfer type selector, fee calculation, and processing time estimates
- **Scheduled Payments** — Create recurring payments (daily/weekly/bi-weekly/monthly) with date picker and description
- **QR Pay** — Generate QR codes for receiving payments and scan/paste QR data for instant payment

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

### Tab 8: Beneficiaries
- **Add Beneficiary** — Form with name, nickname, account number, bank name, SWIFT code, country, currency, type (individual/corporate), and risk level
- **Beneficiary List** — Searchable table with edit and delete actions
- **Risk Color Coding** — Visual indicators for low, medium, high, and critical risk beneficiaries
- **Payment Integration** — Added beneficiaries automatically appear in the Settlement payment dropdown

### Tab 9: Spending 360
- **KPI Summary** — Total Sent, Total Received, Average Risk Score, Highest Transaction, Account Balance
- **Monthly Spending Trend** — Dual-axis chart (spending amount + transaction count) over time
- **Risk Distribution** — Bar chart categorizing transactions by risk level
- **Spending by Currency** — Doughnut chart showing currency distribution
- **Activity by Hour** — Bar chart revealing transaction patterns by time of day
- **Top Beneficiaries** — Ranked table with transaction counts, total amounts, avg risk, and risk badges
- **Recent Transactions** — Complete transaction log with date, beneficiary, amount, risk, and status

### Tab 10: Cards
- **Generate Card** — Issue Visa or Mastercard virtual cards with custom spending limits
- **Card Gallery** — Visual card tiles with masked numbers, expiry dates, and gradient styling
- **Card Actions** — Freeze/Unfreeze toggle, Apple/Google/Samsung wallet provisioning, and permanent cancellation
- **Spending Controls** — Per-card spending limits and merchant category restrictions

### Tab 11: Security
- **E-KYC Verification** — 3-phase animated flow: document upload, AI verification spinner, identity confirmed with confidence score
- **Biometric Settings** — Toggle switches for Face ID, fingerprint, and biometric payment authorization
- **Fraud Alerts** — Real-time feed of fraud alerts with severity levels (critical/high/medium/low) and acknowledge buttons

### Tab 12: Documents
- **Statement List** — Auto-generated monthly account statements with document type and date
- **Download** — One-click download for any statement
- **Date Filter** — Filter statements by date range

### Floating Widgets
- **Support Chat** — Expandable chat panel (bottom-right) with AI-powered bot that responds to payment, account, security, and card queries
- **Notification Center** — Bell icon with unread count badge, dropdown panel with mark-as-read and mark-all-read actions

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
| GET | `/api/accounts/beneficiaries` | List available beneficiaries (hardcoded + user-added) |
| GET | `/api/accounts/sub-accounts` | List user's sub-accounts (Checking, Savings, Business) |
| POST | `/api/accounts/sub-accounts` | Create a new sub-account |
| POST | `/api/accounts/transfer-internal` | Transfer funds between sub-accounts |
| GET | `/api/ledger` | Paginated transaction ledger for current user |

### Beneficiary Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/beneficiaries` | List user's beneficiaries |
| POST | `/api/beneficiaries` | Add a new beneficiary |
| PUT | `/api/beneficiaries/<id>` | Update beneficiary details |
| DELETE | `/api/beneficiaries/<id>` | Deactivate a beneficiary |

### Settlements & Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/settlement` | Execute settlement (returns shap_values) |
| GET | `/api/transactions` | List transactions (paginated) |
| GET | `/api/dashboard` | Real-time dashboard metrics |
| POST | `/api/p2p/send` | Send P2P transfer (by username/email/phone) |
| GET | `/api/p2p/history` | P2P transfer history |
| POST | `/api/transfers/external` | ACH/Wire/SEPA external transfer |
| GET | `/api/payments/scheduled` | List scheduled payments |
| POST | `/api/payments/scheduled` | Create a scheduled payment |
| DELETE | `/api/payments/scheduled/<id>` | Cancel a scheduled payment |
| POST | `/api/qr/generate` | Generate QR code for receiving payment |
| POST | `/api/qr/pay` | Pay using QR code data |

### Card Services

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cards` | List user's virtual cards |
| POST | `/api/cards/generate` | Generate a new virtual card (Visa/MC) |
| POST | `/api/cards/<id>/freeze` | Toggle freeze/unfreeze on a card |
| PUT | `/api/cards/<id>/controls` | Update card spending controls |
| DELETE | `/api/cards/<id>` | Cancel (permanently deactivate) a card |
| POST | `/api/cards/<id>/provision` | Provision card to digital wallet |

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

### Security & Identity

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/kyc/status` | Get current E-KYC verification status |
| POST | `/api/kyc/submit` | Submit KYC verification (passport/ID/license) |
| GET | `/api/fraud/alerts` | List fraud alerts for current user |

### Notifications & Support

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List user's notifications (unread count) |
| POST | `/api/notifications/read` | Mark notification(s) as read |
| POST | `/api/support/message` | Send message to support chat bot |
| GET | `/api/support/history` | Get support chat history |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List auto-generated statements |
| GET | `/api/documents/<id>/download` | Download a specific document |

### Reporting & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reporting/spending-360` | Comprehensive spending analytics |

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
| Frontend | HTML5, Tailwind CSS, Chart.js, D3.js, Font Awesome (13 tabs) |
| API | Python Flask 3.0, JWT, SSE, 75+ REST endpoints |
| Blockchain | Solidity ^0.8.0, Web3.py 6.15, Ganache, py-solc-x |
| AI/ML | scikit-learn, XGBoost, SHAP, NetworkX, Model Caching |
| LLM | Ollama + Llama 3.2 (3B) for support chat |
| DeFi | Constant-Product AMM, HTLC Escrow, Yield Staking |
| Database | SQLite (off-chain vault, 22 tables) |
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
│   └── IPTS_deploy.py           # Main deployment script (3,100+ lines)
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
│   └── ipts_frontend.html              # Single-page frontend (3,500+ lines, 13 tabs)
│
├── docs/
│   ├── generate_report.js              # Technical report DOCX generator
│   ├── generate_briefing.js            # Executive briefing DOCX generator
│   ├── generate_presentation.js        # Demo walkthrough PPTX generator
│   ├── capture_screenshots.js          # Automated screenshot capture (Puppeteer)
│   ├── IPTS_Technical_Report.docx      # Generated technical report
│   ├── G9-IPTS_Executive_Briefing.docx # Generated executive briefing
│   ├── G9-IPTS_Demo_Walkthrough.pptx   # Generated demo walkthrough presentation
│   ├── architecture/                   # Architecture diagrams (SVG + PNG)
│   └── screenshots/                    # UI screenshots (57 PNGs)
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

**Mohamad Idriss** — Lead Architect & Full-Stack Engineer

---

### Screenshots

All feature screenshots are available in [`docs/screenshots/`](docs/screenshots/):

| Screenshot | Feature |
|------------|---------|
| `Dashboard_MultiAccount.png` | Dashboard with sub-accounts, KPIs, and notification bell |
| `Dashboard_Ledger.png` | Real-time ledger panel on Dashboard |
| `Notifications_Panel.png` | Notification dropdown with unread alerts |
| `Payment_Settlement.png` | Settlement form with FX preview |
| `Payment_P2P.png` | P2P Transfer sub-tab |
| `Payment_ACH_Wire_SEPA.png` | External bank transfer with fee calculation |
| `Payment_Scheduled.png` | Scheduled payment creation form |
| `Payment_QR_Pay.png` | QR code generation and scan-to-pay |
| `Beneficiaries_Tab.png` | Beneficiary management with add/edit |
| `Spending_360_Overview.png` | Spending 360 KPI cards and trend chart |
| `Spending_360_Charts.png` | Currency breakdown and activity heatmap |
| `Spending_360_Transactions.png` | Top beneficiaries and recent transactions |
| `Cards_Tab.png` | Virtual card gallery with actions |
| `Security_KYC.png` | E-KYC verification flow |
| `Security_Fraud_Alerts.png` | Fraud alert monitoring feed |
| `Documents_Tab.png` | Document center with statement downloads |
| `Support_Chat.png` | AI-powered support chat widget |

---

<div align="center">
<sub>Built with blockchain, explainable AI, and a commitment to secure, instant financial infrastructure.</sub>
</div>
