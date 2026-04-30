# IPTS — Integrated Payment Transformation System
## Features, Functions & Tab State Reference

> **Last updated:** 2026-04-30  
> **Purpose:** Canonical reference for all features built, current state of every tab, architecture facts, and field-name mappings. Use this file to verify state before making changes and to avoid regressions.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project File Map](#project-file-map)
3. [Database Tables](#database-tables)
4. [Key API Endpoints](#key-api-endpoints)
5. [JS Static File Map](#js-static-file-map)
6. [Tab States](#tab-states)
7. [Features & Enhancements Built](#features--enhancements-built)
8. [Critical Field Name Mappings](#critical-field-name-mappings)
9. [Known Gotchas & Fixes](#known-gotchas--fixes)

---

## Architecture Overview

| Item | Value |
|------|-------|
| Framework | Flask (Python) |
| Port | 5001 |
| Frontend | Single-page app (index.html), TailwindCSS, D3.js v7, Chart.js v4 |
| Database | SQLite at `/Users/mohamadidriss/Projects/IPTS/ipts_vault.db` |
| Virtual env | `/Users/mohamadidriss/Projects/IPTS/.venv/` |
| Start server | `cd /Users/mohamadidriss/Projects/IPTS && .venv/bin/python3 .runtime/app.py` |
| CDN — D3 | `https://d3js.org/d3.v7.min.js` |
| CDN — topojson | `https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js` |
| CDN — world-atlas | `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json` |
| CDN — Chart.js | `https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js` |
| Auth | JWT tokens, role-based (`admin`, `operator`, `compliance`, `auditor`, `datascientist`, `client`) |

### ⚠️ Critical Architecture Warning
The template file `.runtime/templates/index.html` gets **periodically overwritten** by the user's external editor (VS Code etc.), resetting it to ~6741 lines. All JavaScript is now in **static files** (see section below) which survive these resets. If the template is reset, only the HTML structure and inline Jinja variable declarations need re-patching.

---

## Project File Map

```
/Users/mohamadidriss/Projects/IPTS/
├── ipts_vault.db                          ← SQLite database (project root, NOT .runtime)
├── .venv/                                 ← Python virtual environment
├── docs/
│   ├── IPTS_Features_and_State.md         ← THIS FILE
│   ├── screenshots/                       ← UI screenshots
│   └── architecture/
├── .runtime/
│   ├── app.py                             ← Flask application (~5000+ lines)
│   ├── templates/
│   │   └── index.html                     ← Main SPA template (~2500 lines after JS extraction)
│   ├── static/
│   │   └── js/
│   │       └── tabs/
│   │           ├── core.js                ← 42K — shared utilities, dashboard, auth
│   │           ├── tab-network.js         ← 16K — Network tab (D3 force graph, explorer, geo map)
│   │           ├── tab-corridors.js       ← 16K — Corridors tab (geo arc map, table, modal)
│   │           ├── tab-aiml.js            ← 17K — AI/ML tab (models, heatmap, risk)
│   │           ├── tab-compliance.js      ←  4K — Compliance (sanctions, nostro)
│   │           ├── tab-cases.js           ← 18K — Case Management (SAR, notes, assign)
│   │           ├── tab-admin.js           ← 19K — Admin (HITL, audit, users)
│   │           ├── tab-approvals.js       ← stub — delegates to tab-admin.js
│   │           ├── tab-payments.js        ← 47K — Payments, P2P, ACH/SEPA/Wire, QR, Spending360
│   │           ├── tab-mlops.js           ← 11K — MLOps (model cards, retrain)
│   │           ├── tab-cards.js           ←  8K — Virtual Cards (freeze, provision)
│   │           ├── tab-security.js        ← 10K — Security (E-KYC, fraud alerts, documents)
│   │           └── tab-defi.js            ← 32K — DeFi (AMM, staking, HTLC, governance)
│   └── models/
│       └── feature_importance.json
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `user_accounts` | Users: username, role, balance, currency, country |
| `settlements` | Payment/settlement records with risk scores, SHAP values |
| `corridors` | Payment corridors between countries (24 active) |
| `beneficiaries` | Saved beneficiary accounts per user |
| `compliance_cases` | AML/fraud cases linked to settlements |
| `sanctions_list` | OFAC/EU sanctions screening list |
| `hitl_queue` | Human-in-the-loop review queue |
| `four_eyes_approvals` | Dual-approval workflow records |
| `audit_log` | System-wide audit trail |
| `kyc_verifications` | E-KYC submission and verification status |
| `virtual_cards` | Virtual card issuance and management |
| `swift_gpi_tracker` | SWIFT GPI payment tracking |
| `pii_vault` | Encrypted PII storage |
| `amm_pools` | AMM liquidity pool state (DeFi) |
| `staking_positions` | Yield farming / staking positions (DeFi) |
| `escrow_contracts` | HTLC escrow contracts (DeFi) |
| `swap_history` | DEX swap transaction log (DeFi) |

### Corridors Table Schema (critical field names)
```sql
id, name, source_country, dest_country, source_flag, dest_flag,
source_currency, dest_currency, exchange_rate, fee_pct,
min_amount, max_amount, daily_limit, purpose, status,
created_by, created_at, updated_at,
node_validators, node_full, node_relay, node_light
```
> ⚠️ Field is `dest_country` (NOT `destination_country`) and `fee_pct` (NOT `fee_percentage`)

---

## Key API Endpoints

### Auth & Session
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/login` | JWT login |
| POST | `/api/logout` | Logout |
| GET | `/api/session` | Current session info |

### Dashboard
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/dashboard/stats` | KPI counts |
| GET | `/api/fx/rates` | Live FX rates |
| GET | `/api/ledger` | Real-time ledger entries |
| GET | `/api/defi/proof-of-reserve` | Off-chain vs on-chain balance |

### Network
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/network/node-health` | 26 nodes with status, latency, type, country |
| GET | `/api/network/graph` | Legacy ML transaction graph |

### Corridors
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/corridors` | All corridors (supports `?status=all`) |
| GET | `/api/corridors/<id>` | Single corridor |
| POST | `/api/corridors` | Create corridor |
| PUT | `/api/corridors/<id>` | Update corridor |
| PATCH | `/api/corridors/<id>` | Partial update (e.g. status toggle) |
| GET | `/api/fx/rate?from=X&to=Y` | Live exchange rate for corridor form |

### AI/ML
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/ml/metrics` | Model performance metrics |
| GET | `/api/analytics/fraud-heatmap` | Fraud by country (lat/lng/count/avg_risk) |
| GET | `/api/ml/risk-entities` | High-risk entities |

### Compliance & Cases
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/compliance/sanctions` | Sanctions list |
| POST | `/api/compliance/sanctions/screen` | Screen entity |
| GET | `/api/compliance/cases` | Case list |
| GET | `/api/compliance/cases/<id>` | Case detail |
| GET | `/api/compliance/cases/<id>/sar-report` | Download SAR JSON |
| GET | `/api/nostro/positions` | Nostro balances |

### DeFi
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/defi/pools` | AMM pool list |
| POST | `/api/defi/swap` | Execute token swap |
| GET | `/api/defi/staking` | User staking positions |
| POST | `/api/defi/stake` | Lock funds in staking |
| POST | `/api/defi/unstake/<id>` | Unlock + accrue yield |
| GET | `/api/defi/escrow` | User escrow contracts |
| POST | `/api/defi/escrow/create` | Create HTLC escrow |
| POST | `/api/defi/escrow/<id>/claim` | Claim escrow with pre-image |
| POST | `/api/defi/escrow/<id>/refund` | Refund after timelock |

---

## JS Static File Map

### core.js
`apiFetch`, `showToast`, `switchTab`, `initApp`, `startLiveClock`, `loadDashboard`, `loadClientTransactions`, `loadClientAIInsights`, `loadPaymentForm`, global constants (`TOKEN`, `ROLE`, `USER`, `BALANCE`, `API`)

### tab-network.js
**Constants:** `NODE_TYPE_COLOR`, `NODE_TYPE_LABEL`, `NODE_STATUS_COLOR`, `NODE_R`, `NODE_COUNTRY_COORDS`  
**State:** `_networkData`, `_nodeExplorerFilter`  
**Functions:** `switchNetworkSub`, `loadNetworkData`, `_updateNetworkKPIs`, `_renderNetworkGraph`, `networkGraphFilter`, `renderNodeExplorer`, `filterNodeExplorer`, `openNodeDetail`, `closeNodeDetail`, `nodeAction`, `renderNodeLocationMap`

### tab-corridors.js
**Constants:** `COUNTRY_META` (35 countries with currency, flag, lat/lng)  
**State:** `_corridorMapWorld`, `_corridors`, `_corridorFilter`  
**Functions:** `refreshCorridorMap`, `fetchCorridorGraphData`, `_purposeColor`, `corridorMapFilter`, `_drawGeoMap`, `toggleCorridorView`, `loadCorridors`, `filterCorridors`, `showAddCorridorModal`, `closeCorridorModal`, `editCorridor`, `toggleCorridor`, `submitCorridorForm`, `onCorridorCountryChange`, `fetchLiveRate`, `updateNodeTotal`

### tab-aiml.js
`loadModelMetrics`, `loadFraudHeatmap`, `loadRiskEntities`, `loadRiskTrend`, `renderRiskEntity`, `renderFeatureImportance`

### tab-compliance.js
`loadSanctions`, `addSanction`, `checkSanction`, `loadNostro`, `updateNostro`, `screenEntity`

### tab-cases.js
`loadCases`, `openCase`, `closeCase`, `updateCaseStatus`, `addCaseNote`, `generateSAR`, `loadSARModal`

### tab-admin.js
`loadHITL`, `hitlAction`, `loadAudit`, `loadSystemStats`, `loadAdminUsers`, `approveHITL`, `rejectHITL`, `addUser`, `deleteUser`

### tab-payments.js
`loadPaymentForm`, `executeSettlement`, `submitP2P`, `submitACH`, `submitSEPA`, `submitWire`, `submitScheduled`, `generateQR`, `loadBeneficiaries`, `addBeneficiary`, `loadSpending360`

### tab-mlops.js
`loadMLOps`, `triggerRetrain`, `loadModelVersions`, `renderModelCard`, `renderFeatureChart`

### tab-cards.js
`loadCards`, `requestVirtualCard`, `approveCard`, `rejectCard`, `freezeCard`, `unfreezeCard`, `provisionCard`

### tab-security.js
`loadSecurity`, `submitKYC`, `verifyKYC`, `loadFraudAlerts`, `loadDocuments`, `uploadDocument`

### tab-defi.js
`loadDefiTab`, `loadDefiPortfolio`, `getSwapParams`, `onSwapTokenChange`, `flipSwap`, `previewSwap`, `executeSwap`, `loadPools`, `stakeAmount`, `unstake`, `loadStaking`, `updateEscrowCountdowns`, `startEscrowCountdowns`, `createEscrow`, `claimEscrow`, `loadEscrows`, `loadGovernance`, `submitProposal`, `showDefiClientSection`, `showDefiAdminSection`

---

## Tab States

### ✅ Dashboard
**Status:** Fully working — role-adaptive view  
**What it shows (Client role):**
- Welcome banner with account holder name
- 4 KPI cards: Total Settlements, Blocked Transactions, Flagged, Nostro Liquidity (USD)
- Sub-account cards: Checking, Savings, Business with balances
- Live FX Rates ticker: USD/AED, USD/AUD, USD/CAD, USD/CHF, USD/CNY, USD/EUR, USD/GBP, USD/HKD, USD/INR, USD/JPY, USD/SAR, USD/SGD
- Settlement Volume chart
- Recent Transactions list

**What it shows (Admin / Compliance / Operator roles — Admin Command Center):**
- 3 action cards: HITL Queue (orange, pending + awaiting counts), Open Cases (red, by severity), AML Alerts (yellow, high/elevated + 24h new)
- System health strip: blockchain connection dot, model accuracy %, last transaction timestamp
- Recent Activity feed (last 5 audit log entries)
- Clicking any card navigates to the relevant tab

**APIs called:** `/api/dashboard/stats`, `/api/fx/rates`, `/api/ledger`, `/api/dashboard/admin-summary`  
⚠️ Proof of Reserve **moved** to Compliance tab (no longer on Dashboard)

---

### ✅ Approvals
**Status:** Working  
**What it shows:** Transaction approval queue with 4-eyes workflow, approve/reject actions  
**APIs called:** `/api/approvals`, `/api/approvals/<id>/approve`, `/api/approvals/<id>/reject`

---

### ✅ AI/ML
**Status:** Working  
**What it shows:**
- Model performance cards (accuracy, precision, recall, F1, AUC)
- Fraud Heatmap: D3 world map with circle markers sized by transaction count, colored by avg risk score — grouping settlements with `risk_score >= 60` by beneficiary country
- Risk Entities: high-risk counterparties table
- Feature Importance: bar chart of ML model features (top: `amount_zscore` 25.3%, `velocity_7d` 15.3%, etc.)
**APIs called:** `/api/ml/metrics`, `/api/analytics/fraud-heatmap`, `/api/ml/risk-entities`

---

### ✅ Compliance
**Status:** Working  
**What it shows:**
- **Proof of Reserve card** (top of tab, admin-only): Off-chain total vs on-chain `totalSupply()`, ratio, 1:1 backing indicator (green ✓ or red ✗)
- Sanctions list management and entity screening
- Nostro position management  
**APIs called:** `/api/compliance/sanctions`, `/api/nostro/positions`, `/api/defi/proof-of-reserve`

---

### ✅ Case Management
**Status:** Working  
**What it shows:** AML/fraud case list, case detail modal, status updates, case notes, SAR auto-generation  
**SAR generation:** `GET /api/compliance/cases/<id>/sar-report` — returns FinCEN-format JSON as downloadable attachment  
**APIs called:** `/api/compliance/cases`, `/api/compliance/cases/<id>/sar-report`

---

### ✅ Security
**Status:** Working  
**What it shows:** E-KYC submission/verification, fraud alerts, document management  

---

### ✅ Cards
**Status:** Working  
**What it shows:** Virtual card issuance, freeze/unfreeze, provisioning  
**APIs called:** `/api/cards`

---

### ✅ Admin
**Status:** Working  
**What it shows:**
- HITL Queue (Human-in-the-Loop): card view + table view, approve/reject/escalate actions
- Audit Log: system-wide audit trail
- System Stats: resource usage, uptime
- User Management: add/delete users, role assignment
**APIs called:** `/api/hitl`, `/api/audit`, `/api/admin/stats`, `/api/admin/users`

---

### ✅ Network (3 sub-tabs)
**Status:** Fully working — all 3 sub-tabs verified in browser  

#### Sub-tab 1: Node Network
- D3 force-directed graph of **26 blockchain nodes**
- Node types (by color): Validator (purple `#6366f1`), Full Node (teal `#10b981`), Relay (amber `#f59e0b`), Light (slate `#64748b`)
- Status rings on each node: Online (green), Syncing (blue), Degraded (yellow), Offline (red)
- KPI strip: **26 Total · 20 Online · 2 Degraded · 3 Syncing · 1 Offline**
- Filter buttons: All / Validator / Full / Relay / Light / Online / Issues
- Draggable nodes, zoom (0.3×–4×), hover tooltip (type, status, country, latency, peers)
- Dark background (#0f172a), legend top-left

#### Sub-tab 2: Node Explorer
- Searchable/filterable table of all 26 nodes
- Columns: Node ID, Type (badge), Status (dot + text), Country (flag emoji), Latency (ms), Peers, Uptime %, Actions
- Action buttons per row: **Restart** (blue), **Shutdown** (red)
- Click row → detail side panel with full specs + Ping / Restart / Drain / Force Sync / Shutdown buttons

#### Sub-tab 3: Node Locations
- D3 geographic world map (topojson + world-atlas)
- Bubbles per country sized by node count, colored by dominant status
- Hover tooltip: country, node count, status breakdown
- Country list panel below map (sorted by node count)
- Countries with nodes: Saudi Arabia (5), UAE (5), India (4), UK (3), USA (3), Lebanon (2), etc.

**JS file:** `tab-network.js`  
**API called:** `GET /api/network/node-health` → returns 26 nodes with `{id, type, status, country, latency_ms, peer_count, uptime_pct, block_height}`

---

### ✅ MLOps
**Status:** Working  
**What it shows:** ML model version cards, feature importance charts, retrain trigger buttons  
**APIs called:** `/api/mlops/models`, `/api/mlops/retrain`

---

### ✅ Corridors (2 views)
**Status:** Fully working — both views verified in browser  
**Total corridors in DB:** 24  

#### Map View (default)
- D3 geographic world map (topojson + world-atlas, Mercator projection)
- **Curved arc lines** between all corridor country pairs (active = solid, inactive = dashed)
- Country flag emoji dots at each node
- Arc color by purpose: Remittance (indigo), Trade (emerald), Payroll (amber), Investment (pink), Other (slate)
- Hover tooltip on arc: corridor name, source→dest, currency pair, rate, fee, purpose, status
- Zoom +/− buttons (top-right), drag to pan, scroll to zoom
- Filter bar: **All / Active / Inactive / Remittance / Trade / Payroll**
- KPI strip below map: Total Corridors / Active / Countries
- **Add Corridor** button (top-right)

#### List View
- Table: Corridor name, Source, Dest, Currencies (e.g. AED→PHP), Rate, Fee %, Purpose, Status badge, Edit + Enable/Disable buttons
- Search + status filter bar

#### Add/Edit Modal
- Fields: Name, Source Country, Dest Country, Source Currency, Dest Currency, Exchange Rate (+ "Get Live Rate" button), Fee %, Purpose, Min/Max Amount, Daily Limit, Node allocation
- `onCorridorCountryChange()` auto-fills currency from `COUNTRY_META`

**JS file:** `tab-corridors.js`  
**APIs called:** `GET /api/corridors?status=all`, `GET /api/corridors/<id>`, `POST /api/corridors`, `PUT /api/corridors/<id>`, `PATCH /api/corridors/<id>`, `GET /api/fx/rate?from=X&to=Y`

#### 24 Corridors in DB
| # | Corridor | Direction |
|---|---------|-----------|
| 1 | India → KSA | INR→SAR |
| 2 | KSA → UAE | SAR→AED |
| 3 | KSA → USA | SAR→USD |
| 4 | UAE → Egypt | AED→EGP |
| 5 | Lebanon → USA | LBP→USD |
| 6 | KSA → Lebanon | SAR→LBP |
| 7 | UAE → Lebanon | AED→LBP |
| 8 | UK → Lebanon | GBP→LBP |
| 9 | USA → Lebanon | USD→LBP |
| 10 | Australia → Lebanon | AUD→LBP |
| 11 | Saudi Arabia → Indonesia | SAR→IDR *(bridging)* |
| 12 | UAE → Singapore | AED→SGD *(bridging)* |
| 13 | UAE → Philippines | AED→PHP |
| 14 | UAE → Pakistan | AED→PKR |
| 15 | UAE → India | AED→INR |
| 16 | UK → Nigeria | GBP→NGN |
| 17 | USA → Mexico | USD→MXN |
| 18 | Singapore → Indonesia | SGD→IDR |
| 19 | Germany → South Korea | EUR→KRW |
| 20 | USA → India | USD→INR |
| 21 | Canada → Philippines | CAD→PHP |
| 22 | Qatar → Nepal | QAR→NPR |
| 23 | India → KSA *(variant)* | INR→SAR |
| 24 | *(additional)* | |

---

### ✅ DeFi
**Status:** Working (admin and client views)  
**What it shows:**

#### Portfolio Strip (all client sub-tabs)
- 4 KPI chips above sub-tab buttons: Available balance, Total Staked, Locked in Escrow, Accrued Yield
- Populated by `loadDefiPortfolio()` → `GET /api/defi/portfolio`

#### Admin view
- KPI cards: Total TVL, 24h Volume, Accrued Fees, Active Stakes
- Pool Management: AMM pool list with reserves, price, TVL, 24h volume
- Staking Admin: position overview, yield accrual
- Governance: proposal creation/voting, parameter changes, emergency controls

#### Client view (sub-tabs: Swap / Staking / Escrow)
- **Swap**: Bidirectional FROM/TO token selectors; flip button swaps tokens; same-token guard; live price preview  
  Uses constant-product AMM formula: `x * y = k`  
  All swaps are USD-anchored: `buy` = USD→foreign, `sell` = foreign→USD  
  Pool pairs: USD/EUR, USD/GBP, USD/JPY, USD/CHF, USD/AED, USD/ETH  
- **Staking**: Three tiers: Flexible (3.5% APY, no lock), 30-day lock (5.2% APY), 90-day lock (8.1% APY)  
  Active positions show progress bar + days-remaining countdown; "Flexible — unstake anytime" for flexible tier  
- **Escrow (HTLC)**: Create escrow with SHA-256 hashlock + configurable timelock, claim with pre-image secret, refund after expiry  
  Locked contracts show live countdown timer (updated every 30 seconds via `startEscrowCountdowns`)

**DB tables:** `amm_pools`, `staking_positions`, `escrow_contracts`, `swap_history`  
**JS file:** `tab-defi.js`  
**APIs:** `/api/defi/portfolio`, `/api/defi/swap`, `/api/defi/pools`, `/api/defi/staking`, `/api/defi/unstake/<id>`, `/api/defi/escrow`, `/api/defi/escrow/create`, `/api/defi/escrow/<id>/claim`, `/api/defi/escrow/<id>/refund`

---

## Features & Enhancements Built

### Phase 1 — Core Platform
| Feature | Description |
|---------|-------------|
| Multi-role auth | JWT-based auth for admin, operator, compliance, auditor, datascientist, client |
| Settlement engine | Real-time payment settlement with ML risk scoring |
| ML fraud detection | Random Forest model scoring every settlement; SHAP explainability |
| HITL queue | Human-in-the-loop review for high-risk settlements |
| 4-eyes approval | Dual-approval workflow for large transactions |
| Sanctions screening | OFAC/EU list screening with fuzzy match |
| Nostro management | Multi-currency nostro position tracking |
| Audit log | Immutable system audit trail |
| Virtual cards | Card issuance, freeze, unfreeze, provisioning |
| E-KYC | Identity verification submission and review |

### Phase 2 — Analytics & Compliance
| Feature | Description |
|---------|-------------|
| AI/ML tab | Model performance metrics, feature importance chart |
| Fraud Heatmap | D3 world map with risk-weighted circle markers by country |
| SAR auto-generation | `GET /api/compliance/cases/<id>/sar-report` — FinCEN-format JSON download |
| Risk entities | High-risk counterparty identification table |
| SWIFT GPI tracker | Payment tracking with GPI status updates |
| Case management | AML/fraud case lifecycle with notes and status workflow |

### Phase 3 — DeFi Features
| Feature | Description |
|---------|-------------|
| Proof of Reserve | Compliance tab card: off-chain vs on-chain totals, 1:1 backing indicator (moved from Dashboard) |
| DEX / AMM | Constant-product formula (x·y=k), USD/EUR/GBP/JPY/AED/ETH pools |
| Yield Farming / Staking | 3 tiers (Flexible 3.5%, 30-day 5.2%, 90-day 8.1%), accrued yield calc |
| HTLC Escrow | Hash-time-locked contracts, claim with pre-image, refund after timelock |
| Governance | Proposal creation, voting, parameter changes, emergency protocol |

### Phase 4 — Network & Corridors
| Feature | Description |
|---------|-------------|
| Network tab redesign | Replaced single graph with 3-sub-tab structure |
| Node Network graph | D3 force graph of 26 nodes, type/status color coding, zoom, drag |
| Node Explorer | Searchable table with all node specs + Restart/Shutdown/Sync actions |
| Node Locations map | D3 geo world map with country node-count bubbles |
| Corridors tab | New dedicated tab with map and list views |
| Corridor geographic map | D3 Mercator projection, curved arcs, country flag dots, zoom +/− |
| 10 new corridors | UAE-Philippines, UAE-Pakistan, UAE-India, UK-Nigeria, USA-Mexico, Singapore-Indonesia, Germany-South Korea, USA-India, Canada-Philippines, Qatar-Nepal |
| Bridging corridors | UAE-Singapore (AED→SGD), Saudi Arabia-Indonesia (SAR→IDR) to connect isolated nodes |
| Corridor map connections | Fixed `dest_country` field mismatch that prevented arcs from rendering |

### Phase 5 — Code Architecture
| Feature | Description |
|---------|-------------|
| JS refactor | Extracted 5000+ lines of inline JS into 13 separate static files |
| Per-tab isolation | Each tab's logic in its own file — editing one cannot break others |
| topojson CDN | Added `topojson-client` CDN for geo maps (was missing) |
| HTML size reduction | `index.html` reduced from ~7500 lines to ~2500 lines |

### Phase 6 — UX, Ops & DeFi Enhancements
| Feature | Description |
|---------|-------------|
| Admin Command Center | Role-aware dashboard replacing generic KPIs for admin/compliance/operator: HITL queue, open cases, AML alerts, system health, activity feed |
| Proof of Reserve relocated | Moved from Dashboard to Compliance tab — logically correct placement |
| DeFi portfolio strip | 4-chip summary (balance, staked, escrow, yield) above DeFi sub-tabs |
| Bidirectional token swap | FROM/TO selectors, flip button, same-token guard, `getSwapParams()` derives direction |
| Staking countdown | Progress bar + days-remaining for locked positions; "Flexible — unstake anytime" for flexible tier |
| Escrow live timer | `.escrow-countdown` spans updated every 30 seconds by `startEscrowCountdowns()` |
| MLOps sequence detector fix | `feature_importances_` used instead of `get_booster()` (GradientBoostingClassifier, not XGBoost) |
| SHAP last-tx panel removed | Stale dead panel and `featureChart` canvas removed from MLOps tab |
| macOS LaunchAgent | `com.ipts.server.plist` auto-starts IPTS on login with `KeepAlive: true` crash recovery |

---

## Critical Field Name Mappings

These mismatches caused bugs and have been fixed. Always use the DB column names:

| Wrong (don't use) | Correct (DB column) | Table |
|-------------------|---------------------|-------|
| `destination_country` | `dest_country` | `corridors` |
| `fee_percentage` | `fee_pct` | `corridors` |
| `corridor_name` | `name` | `corridors` |

---

## Known Gotchas & Fixes

### 1. Template gets overwritten by external editor
**Problem:** Opening `index.html` in VS Code and saving resets it to the base ~6741-line version.  
**Solution:** All JS is now in `.runtime/static/js/tabs/*.js` which survives resets. Only the HTML structure needs re-applying.

### 2. re.sub() backslash escape error
**Problem:** `re.sub(pattern, NEW_JS, html)` fails with `re.error: bad escape \s` when `NEW_JS` contains JavaScript regex literals.  
**Solution:** Use `re.sub(pattern, lambda m: NEW_JS, html, count=1, flags=re.DOTALL)` — the lambda prevents Python from interpreting backslash sequences.

### 3. Flask caches templates
**Problem:** After editing `index.html`, browser still serves old version.  
**Solution:** Kill and restart Flask process: `pkill -f "python.*app.py"; cd /Users/mohamadidriss/Projects/IPTS && .venv/bin/python3 .runtime/app.py &`

### 4. switchNetworkSub case mismatch
**Problem:** HTML buttons pass `'network'`/`'explorer'`/`'locations'` (lowercase) but function compared against `'Network'`/`'Explorer'`/`'Locations'` (capitalized), so all panels stayed hidden.  
**Fix:** Normalize: `const subNorm = sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase();`

### 5. defiSwap escaped its tab-content container
**Problem:** Premature `</div>` at line ~2059 closed `tab-defi` early, causing `defiSwap`, `defiClientTabs`, and all DeFi client sections to render as direct children of `mainApp`. They appeared on every tab.  
**Fix:** Remove the extra `</div>` so `tab-defi` correctly contains all its sub-sections.

### 6. topojson not loaded
**Problem:** Node Locations and Corridor geo maps failed silently because `topojson` global was undefined.  
**Fix:** Added `<script src="https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js">` to `index.html` head.

### 7. Singapore/Indonesia isolated on corridor map
**Problem:** Only connected to each other, no arcs to rest of network.  
**Fix:** Added bridging corridors: UAE→Singapore (AED→SGD) and Saudi Arabia→Indonesia (SAR→IDR).

### 8. Germany–South Korea named "Germany–Turkey"
**Problem:** Data entry error when inserting corridor.  
**Fix:** `UPDATE corridors SET name='Germany - South Korea' WHERE id=...`

### 9. Server running from wrong directory
**Problem:** `python app.py` from wrong CWD can't find DB (which is at project root, not `.runtime/`).  
**Solution:** Always start with: `cd /Users/mohamadidriss/Projects/IPTS && .venv/bin/python3 .runtime/app.py`

### 10. sequence_detector missing from MLOps insights
**Problem:** `hasattr(model, 'get_booster')` returned False because `sequence_detector` is a sklearn `GradientBoostingClassifier`, not XGBoost. The endpoint returned no data for that model.  
**Fix:** Check `hasattr(model, 'feature_importances_')` first (covers GradientBoosting + RandomForest); fall back to `get_booster().get_fscore()` for XGBoost only.

### 11. Port 5001 already in use after restart
**Problem:** Stale Python process holds the port after system wake/crash.  
**Fix:** `lsof -ti :5001 | xargs kill -9` then restart. The LaunchAgent handles this automatically on clean boot.

### 12. DeFi swap direction wrong for non-USD FROM token
**Problem:** Old `previewSwap()` always assumed FROM=USD. Selecting EUR→USD gave wrong output amount.  
**Fix:** `getSwapParams()` derives `{pair, direction}` from FROM/TO selectors. `direction='buy'` = USD→foreign; `direction='sell'` = foreign→USD.

---

## Verification Checklist

Run this after any major change to confirm all tabs still work:

- [ ] Dashboard loads KPIs and Admin Command Center (admin) or welcome banner (client)
- [ ] Network → Node Network: 26 nodes visible, KPIs show 26/20/2/3/1
- [ ] Network → Node Explorer: table shows all 26 nodes with actions
- [ ] Network → Node Locations: world map loads with node bubbles
- [ ] Corridors → Map View: world map with curved arcs between all corridor countries
- [ ] Corridors → List View: table shows all 24 corridors
- [ ] Corridors → Add Corridor modal opens and live rate fetch works
- [ ] AI/ML tab loads model metrics and fraud heatmap
- [ ] DeFi tab: Swap preview, staking tiers visible, escrow form loads
- [ ] No JS console errors on page load
- [ ] `curl -s http://localhost:5001/ | grep -c "script src"` returns 13+ (all static files referenced)
