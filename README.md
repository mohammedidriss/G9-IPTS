# IPTS — Integrated Payment Transformation System
### Blockchain · AI · Cybersecurity

A production-grade cross-border payment platform built on Ethereum smart contracts, an ensemble of five AI/ML models, and a Zero Trust security architecture.

---

## Quick Start — 3 Steps

### Step 1 — Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### Step 2 — Run the start script
```bash
chmod +x start.sh
./start.sh
```

### Step 3 — Open your browser
```
http://localhost:5001
```

That is it. The database, all records, and all user accounts are included.

---

## Requirements

| Requirement | Version |
|---|---|
| Python | 3.10 or later |
| Operating System | macOS, Linux, or Windows (WSL) |
| Disk Space | ~500 MB (including ML models) |
| RAM | 4 GB minimum, 8 GB recommended |

No Docker. No external database. No cloud account needed.

---

## Login Accounts

### Staff
| Username | Password | Role |
|---|---|---|
| `mohamad` | `Mohamad@2026!` | Admin |
| `rohit` | `Rohit@2026!` | Compliance Officer |
| `sriram` | `Sriram@2026!` | Operator |
| `ali` | `Ali@2026!` | Auditor |
| `vibin` | `Vibin@2026!` | Data Scientist |

### Clients
| Username | Password | Full Name |
|---|---|---|
| `walid` | `Walid@2026!` | Walid ElMahdy |
| `lena` | `Lena@2026!` | Lena Novak |
| `james` | `James@2026!` | James Okafor |
| `mei` | `Mei@2026!` | Mei Lin |
| `carlos` | `Carlos@2026!` | Carlos Mendez |
| `aisha` | `Aisha@2026!` | Aisha Al-Rashid |
| `henrik` | `Henrik@2026!` | Henrik Svensson |

---

## What Is Included

| Item | Details |
|---|---|
| **Flask backend** | `app.py` — 6,000+ lines, 100+ API endpoints |
| **Frontend** | Single-page app, 18 role-based tabs |
| **Database** | `ipts_vault.db` — SQLite with all seeded records and transaction history |
| **ML Models** | 5 pre-trained models in `models/` — no retraining needed |
| **Smart Contracts** | 7 Ethereum contracts (Ganache local chain) |
| **Demo scripts** | `docs/` — 8-10 min presenter guides |

---

## Platform Tabs by Role

| Tab | Admin | Compliance | Operator | Auditor | Data Scientist | Client |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Payments | | | | | | ✅ |
| AI Engine | ✅ | ✅ | | ✅ | ✅ | |
| Compliance | ✅ | ✅ | | ✅ | | |
| Case Management | ✅ | ✅ | | ✅ | | |
| Security / SOC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (E-KYC) |
| Operations Center | | | ✅ | | | |
| Admin | ✅ | | | | | |
| AML | ✅ | ✅ | ✅ | ✅ | ✅ | |
| DeFi | ✅ | | | | | |
| MLOps | ✅ | | | | ✅ | |
| DS Workbench | ✅ | | | | ✅ | |
| Spending 360 | | | | | | ✅ |
| Ledger | ✅ | ✅ | ✅ | ✅ | ✅ | |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser (SPA)                  │
│         18 role-based tabs · JWT auth           │
└──────────────────┬──────────────────────────────┘
                   │ HTTP / REST
┌──────────────────▼──────────────────────────────┐
│              Flask Backend (app.py)              │
│   Zero Trust · RBAC · Rate Limiting · SSE       │
└──────┬──────────────┬──────────────┬────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼───────────┐
│   SQLite DB  │ │  ML Models │ │   Ethereum     │
│ ipts_vault  │ │  5 models  │ │  7 Smart       │
│    .db      │ │  + SHAP    │ │  Contracts     │
└─────────────┘ └────────────┘ └────────────────┘
```

### Smart Contracts (Ethereum / Ganache)
| Contract | Purpose |
|---|---|
| `IPTS_Enterprise_Settlement` | Executes on-chain settlement, emits tx_hash |
| `ComplianceOracle` | Sanctions screening, writes compliance flags on-chain |
| `MultiSigApproval` | Enforces four-eyes control for high-value transactions |
| `AuditTrail` | Append-only immutable event log |
| `IPTS_Stablecoin` | ERC-20 stablecoin, Proof of Reserve |
| `LiquidityPool` | Nostro liquidity management |
| `HTLC` | Hash Time-Locked Contracts for atomic cross-border settlement |

### AI / ML Models
| Model | Purpose |
|---|---|
| Isolation Forest | Anomaly detection |
| Random Forest | Supervised fraud classification |
| XGBoost | Gradient-boosted fraud classification |
| Autoencoder | Deep pattern reconstruction |
| Sequence Detector | Temporal velocity chain analysis |

All scores are explained using **SHAP** (SHapley Additive exPlanations).

---

## Manual Start (without start.sh)

```bash
# 1. Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Sync runtime directory
mkdir -p .runtime/templates .runtime/static
cp app.py .runtime/app.py
cp -r templates/. .runtime/templates/
cp -r static/. .runtime/static/

# 4. Start the server
python3 .runtime/app.py --port 5001
```

---

## Troubleshooting

**Port already in use**
```bash
lsof -i :5001 | grep LISTEN        # find the PID
kill -9 <PID>                       # stop it
./start.sh                          # restart
```

**Module not found errors**
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

**Database reset** (restore to original seeded state)
```bash
rm ipts_vault.db
python3 -c "import app"            # re-runs seed on first import
```

---

## Group 9 — IPTS Project Team
Built as part of the Emerging Technologies module — Doctorate Programme, UpGrad.
