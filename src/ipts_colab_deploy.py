#!/usr/bin/env python3
"""
IPTS - Integrated Payment Transformation System
Enterprise-Grade Colab Deployment Script
7-Layer Convergent Architecture for Cross-Border Settlements

Run this in Google Colab to deploy the full IPTS stack:
  - AI/ML Fraud Detection (4 models)
  - Ethereum Smart Contracts (5 contracts via Ganache)
  - Flask REST API (Zero Trust, JWT, AML Engine)
  - Real-time Dashboard (SSE, D3.js, Chart.js)
"""

import os
import sys
import time
import json
import shutil
import signal
import subprocess

print("=" * 70)
print("  IPTS - Integrated Payment Transformation System")
print("  Enterprise Deployment Script v3.0")
print("=" * 70)

# ============================================================
# PHASE 0 - ENVIRONMENT CLEANUP
# ============================================================
print("\n[PHASE 0] Environment Cleanup...")

# Kill any existing processes on ports 8545 and 5000
for port in [8545, 5000]:
    try:
        result = subprocess.run(
            f"lsof -ti:{port}", shell=True, capture_output=True, text=True
        )
        if result.stdout.strip():
            pids = result.stdout.strip().split('\n')
            for pid in pids:
                os.system(f"kill -9 {pid} 2>/dev/null")
            print(f"  Killed processes on port {port}: {pids}")
        else:
            print(f"  Port {port} is free")
    except Exception:
        pass

# Clean old directory
if os.path.exists("/content/ipts"):
    shutil.rmtree("/content/ipts")
    print("  Cleaned old /content/ipts directory")

print("[PHASE 0] Complete.\n")

# ============================================================
# PHASE 1 - DEPENDENCIES
# ============================================================
print("[PHASE 1] Installing Dependencies...")

deps = [
    ("npm install -g ganache", "ganache"),
    ("npm install -g localtunnel", "localtunnel"),
    ("pip install -q web3==6.15.1", "web3"),
    ("pip install -q py-solc-x==2.0.3", "py-solc-x"),
    ("pip install -q flask==3.0.0", "flask"),
    ("pip install -q pyjwt==2.8.0", "pyjwt"),
    ("pip install -q scikit-learn==1.4.0", "scikit-learn"),
    ("pip install -q networkx==3.2.1", "networkx"),
    ("pip install -q cryptography==42.0.2", "cryptography"),
    ("pip install -q joblib==1.3.2", "joblib"),
    ("pip install -q imbalanced-learn==0.12.0", "imbalanced-learn"),
    ("pip install -q xgboost==2.0.3", "xgboost"),
    ("pip install -q shap==0.44.0", "shap"),
]

for cmd, name in deps:
    print(f"  Installing {name}...", end=" ", flush=True)
    ret = os.system(f"{cmd} > /dev/null 2>&1")
    print("OK" if ret == 0 else f"WARN (exit {ret})")

print("[PHASE 1] Complete.\n")

# ============================================================
# PHASE 2 - PROJECT STRUCTURE
# ============================================================
print("[PHASE 2] Creating Project Structure...")

dirs = [
    "/content/ipts",
    "/content/ipts/templates",
    "/content/ipts/models",
    "/content/ipts/data",
    "/content/ipts/contracts",
    "/content/ipts/logs",
]
for d in dirs:
    os.makedirs(d, exist_ok=True)
    print(f"  Created {d}")

print("[PHASE 2] Complete.\n")

# ============================================================
# PHASE 3 - AI/ML MODEL TRAINING
# ============================================================
print("[PHASE 3] AI/ML Model Training...")
print("  Generating 15,000 synthetic transactions...")

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, f1_score, accuracy_score
# SMOTE removed — using class_weight='balanced' instead for realistic accuracy
import xgboost as xgb
import networkx as nx
import joblib

np.random.seed(42)

N_TOTAL = 15000
N_FRAUD = 750   # 5% fraud rate (more realistic for imbalanced learning)
N_NORMAL = N_TOTAL - N_FRAUD
N_FP_BAIT = 500  # normal transactions that LOOK suspicious (false positive bait)
N_CLEAN_NORMAL = N_NORMAL - N_FP_BAIT

# Generate clean normal transactions
normal_data = {
    'amount': np.random.lognormal(mean=9.5, sigma=1.2, size=N_CLEAN_NORMAL).clip(100, 500000),
    'hour': np.random.randint(0, 24, N_CLEAN_NORMAL),
    'day_of_week': np.random.randint(0, 7, N_CLEAN_NORMAL),
    'freq_7d': np.random.randint(1, 25, N_CLEAN_NORMAL),
    'is_round': np.random.choice([0, 1], N_CLEAN_NORMAL, p=[0.82, 0.18]),
    'country_risk': np.random.beta(2, 5, N_CLEAN_NORMAL),  # skewed low
    'sender_id': np.random.randint(0, 500, N_CLEAN_NORMAL),
    'receiver_id': np.random.randint(0, 500, N_CLEAN_NORMAL),
    'is_fraud': np.zeros(N_CLEAN_NORMAL, dtype=int),
}

# False-positive bait: normal transactions with suspicious-looking features
# These will cause realistic false positives and prevent 100% accuracy
fp_bait_data = {
    'amount': np.concatenate([
        np.random.uniform(9000, 9999, N_FP_BAIT // 4),      # Looks like structuring
        np.random.uniform(100000, 600000, N_FP_BAIT // 4),   # High value but legit
        np.random.uniform(50000, 200000, N_FP_BAIT // 4),    # Medium-high
        np.random.uniform(5000, 50000, N_FP_BAIT - 3 * (N_FP_BAIT // 4)),
    ]),
    'hour': np.random.choice([0, 1, 2, 3, 22, 23], N_FP_BAIT),  # Late-night but legit
    'day_of_week': np.random.randint(0, 7, N_FP_BAIT),
    'freq_7d': np.random.randint(10, 35, N_FP_BAIT),  # Overlaps with fraud freq
    'is_round': np.random.choice([0, 1], N_FP_BAIT, p=[0.5, 0.5]),
    'country_risk': np.random.uniform(0.4, 0.9, N_FP_BAIT),  # Elevated but legit
    'sender_id': np.random.randint(0, 200, N_FP_BAIT),  # Overlaps with fraud IDs
    'receiver_id': np.random.randint(0, 200, N_FP_BAIT),
    'is_fraud': np.zeros(N_FP_BAIT, dtype=int),  # NOT fraud
}

# Generate fraud transactions — with realistic noise
# 70% have clear fraud signals, 30% are subtle/stealthy
N_CLEAR_FRAUD = int(N_FRAUD * 0.7)
N_SUBTLE_FRAUD = N_FRAUD - N_CLEAR_FRAUD

clear_fraud_amounts = np.concatenate([
    np.random.uniform(9000, 9999, N_CLEAR_FRAUD // 3),          # Structuring
    np.random.uniform(300000, 2000000, N_CLEAR_FRAUD // 3),     # High value
    np.random.uniform(15000, 150000, N_CLEAR_FRAUD - 2 * (N_CLEAR_FRAUD // 3)),
])
subtle_fraud_amounts = np.random.lognormal(mean=10.0, sigma=1.0, size=N_SUBTLE_FRAUD).clip(5000, 300000)

fraud_data = {
    'amount': np.concatenate([clear_fraud_amounts, subtle_fraud_amounts]),
    'hour': np.concatenate([
        np.random.choice([0, 1, 2, 3, 22, 23], N_CLEAR_FRAUD),
        np.random.randint(0, 24, N_SUBTLE_FRAUD),  # Subtle: normal hours
    ]),
    'day_of_week': np.random.randint(0, 7, N_FRAUD),
    'freq_7d': np.concatenate([
        np.random.randint(12, 45, N_CLEAR_FRAUD),
        np.random.randint(5, 25, N_SUBTLE_FRAUD),  # Subtle: normal freq
    ]),
    'is_round': np.concatenate([
        np.random.choice([0, 1], N_CLEAR_FRAUD, p=[0.35, 0.65]),
        np.random.choice([0, 1], N_SUBTLE_FRAUD, p=[0.75, 0.25]),
    ]),
    'country_risk': np.concatenate([
        np.random.uniform(0.5, 1.0, N_CLEAR_FRAUD),
        np.random.uniform(0.2, 0.8, N_SUBTLE_FRAUD),  # Subtle: moderate risk
    ]),
    'sender_id': np.concatenate([
        np.random.randint(0, 100, N_CLEAR_FRAUD),
        np.random.randint(0, 400, N_SUBTLE_FRAUD),  # Subtle: wider range
    ]),
    'receiver_id': np.concatenate([
        np.random.randint(0, 100, N_CLEAR_FRAUD),
        np.random.randint(0, 400, N_SUBTLE_FRAUD),
    ]),
    'is_fraud': np.ones(N_FRAUD, dtype=int),
}

df = pd.concat([
    pd.DataFrame(normal_data),
    pd.DataFrame(fp_bait_data),
    pd.DataFrame(fraud_data),
], ignore_index=True)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

# Compute velocity features per sender (simulated sliding windows)
print("  Computing velocity features...")
sender_groups = df.groupby('sender_id')
df['velocity_1h'] = sender_groups['amount'].transform(lambda x: x.rolling(3, min_periods=1).sum())
df['velocity_24h'] = sender_groups['amount'].transform(lambda x: x.rolling(10, min_periods=1).sum())
df['velocity_7d'] = sender_groups['amount'].transform(lambda x: x.rolling(30, min_periods=1).sum())
df['avg_tx_amount'] = sender_groups['amount'].transform('mean')
df['std_tx_amount'] = sender_groups['amount'].transform('std').fillna(0)
df['amount_zscore'] = ((df['amount'] - df['avg_tx_amount']) / df['std_tx_amount'].clip(lower=1)).fillna(0)
df['unique_receivers_7d'] = sender_groups['receiver_id'].transform('nunique')
df['is_new_receiver'] = (~df.duplicated(subset=['sender_id', 'receiver_id'])).astype(int)

features = ['amount', 'hour', 'day_of_week', 'freq_7d', 'is_round', 'country_risk',
            'sender_id', 'receiver_id', 'velocity_1h', 'velocity_24h', 'velocity_7d',
            'avg_tx_amount', 'std_tx_amount', 'amount_zscore', 'unique_receivers_7d', 'is_new_receiver']
X = df[features].values
y = df['is_fraud'].values

indices = np.arange(len(df))
X_train, X_test, y_train, y_test, train_idx, test_idx = train_test_split(
    X, y, indices, test_size=0.2, random_state=42, stratify=y
)

print(f"  Dataset: {len(df)} transactions, {y.sum()} fraud ({100*y.mean():.1f}%)")
print(f"  Train: {len(X_train)}, Test: {len(X_test)}")

# Model 1: Isolation Forest
print("  Training Model 1: Isolation Forest...", end=" ", flush=True)
t0 = time.time()
iso_forest = IsolationForest(
    n_estimators=100, contamination=0.05, random_state=42, n_jobs=-1
)
iso_forest.fit(X_train)
iso_preds = (iso_forest.predict(X_test) == -1).astype(int)
iso_f1 = f1_score(y_test, iso_preds, zero_division=0)
print(f"F1={iso_f1:.3f} ({time.time()-t0:.1f}s)")
joblib.dump(iso_forest, "/content/ipts/models/isolation_forest.pkl")

# Model 2: Random Forest (regularized — no SMOTE, class_weight balanced)
print("  Training Model 2: Random Forest (regularized)...", end=" ", flush=True)
t0 = time.time()
rf_clf = RandomForestClassifier(
    n_estimators=150, max_depth=12, min_samples_leaf=10,
    max_features='sqrt', class_weight='balanced',
    random_state=42, n_jobs=-1
)
rf_clf.fit(X_train, y_train)
rf_preds = rf_clf.predict(X_test)
rf_f1 = f1_score(y_test, rf_preds, zero_division=0)
rf_acc = accuracy_score(y_test, rf_preds)
print(f"F1={rf_f1:.3f}, Acc={rf_acc:.3f} ({time.time()-t0:.1f}s)")
joblib.dump(rf_clf, "/content/ipts/models/random_forest.pkl")

# Model 3: XGBoost (regularized)
print("  Training Model 3: XGBoost (regularized)...", end=" ", flush=True)
t0 = time.time()
scale_pos = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
xgb_clf = xgb.XGBClassifier(
    n_estimators=200, max_depth=6, learning_rate=0.05,
    scale_pos_weight=scale_pos, reg_alpha=1.0, reg_lambda=2.0,
    subsample=0.8, colsample_bytree=0.8,
    random_state=42, use_label_encoder=False, eval_metric='logloss', n_jobs=-1
)
xgb_clf.fit(X_train, y_train)
xgb_preds = xgb_clf.predict(X_test)
xgb_f1 = f1_score(y_test, xgb_preds, zero_division=0)
xgb_acc = accuracy_score(y_test, xgb_preds)
print(f"F1={xgb_f1:.3f}, Acc={xgb_acc:.3f} ({time.time()-t0:.1f}s)")
joblib.dump(xgb_clf, "/content/ipts/models/xgboost.pkl")

# Model 4: Autoencoder (MLPRegressor on normal data only)
print("  Training Model 4: Autoencoder (MLPRegressor)...", end=" ", flush=True)
t0 = time.time()
X_normal = X_train[y_train == 0]
autoencoder = MLPRegressor(
    hidden_layer_sizes=(64, 32, 16, 32, 64),
    activation='relu', max_iter=200, random_state=42
)
autoencoder.fit(X_normal, X_normal)
recon = autoencoder.predict(X_test)
recon_error = np.mean((X_test - recon) ** 2, axis=1)
threshold = np.percentile(
    np.mean((X_normal - autoencoder.predict(X_normal)) ** 2, axis=1), 97
)
ae_preds = (recon_error > threshold).astype(int)
ae_f1 = f1_score(y_test, ae_preds, zero_division=0)
print(f"F1={ae_f1:.3f} ({time.time()-t0:.1f}s)")
joblib.dump(autoencoder, "/content/ipts/models/autoencoder.pkl")
joblib.dump(threshold, "/content/ipts/models/ae_threshold.pkl")

# Model 5: LightGBM-style sequence detector using rolling statistics
print("  Training Model 5: Sequence Anomaly Detector...", end=" ", flush=True)
t0 = time.time()
from sklearn.ensemble import GradientBoostingClassifier
seq_features = ['velocity_1h', 'velocity_24h', 'velocity_7d', 'amount_zscore',
                'unique_receivers_7d', 'is_new_receiver', 'amount', 'freq_7d']
seq_feat_idx = [features.index(f) for f in seq_features]
X_seq_train = X_train[:, seq_feat_idx]
X_seq_test = X_test[:, seq_feat_idx]
seq_clf = GradientBoostingClassifier(
    n_estimators=150, max_depth=5, learning_rate=0.1,
    subsample=0.8, random_state=42
)
seq_clf.fit(X_seq_train, y_train)
seq_preds = seq_clf.predict(X_seq_test)
seq_f1 = f1_score(y_test, seq_preds, zero_division=0)
seq_acc = accuracy_score(y_test, seq_preds)
print(f"F1={seq_f1:.3f}, Acc={seq_acc:.3f} ({time.time()-t0:.1f}s)")
joblib.dump(seq_clf, "/content/ipts/models/sequence_detector.pkl")

# Save model metrics
metrics = {
    'isolation_forest': {'f1': float(iso_f1), 'accuracy': float(accuracy_score(y_test, iso_preds))},
    'random_forest': {'f1': float(rf_f1), 'accuracy': float(accuracy_score(y_test, rf_preds))},
    'xgboost': {'f1': float(xgb_f1), 'accuracy': float(accuracy_score(y_test, xgb_preds))},
    'autoencoder': {'f1': float(ae_f1), 'accuracy': float(accuracy_score(y_test, ae_preds))},
    'sequence_detector': {'f1': float(seq_f1), 'accuracy': float(seq_acc)},
}
with open("/content/ipts/models/metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)

# Save feature names for Flask
with open("/content/ipts/models/feature_names.json", "w") as f:
    json.dump(features, f)

# Feature importance from Random Forest
feat_importance = dict(zip(features, rf_clf.feature_importances_.tolist()))
with open("/content/ipts/models/feature_importance.json", "w") as f:
    json.dump(feat_importance, f, indent=2)

# SHAP Feature Importance (global)
print("  Computing SHAP explanations...", end=" ", flush=True)
t0 = time.time()
try:
    import shap
    explainer = shap.TreeExplainer(xgb_clf)
    shap_sample = X_test[:200]  # sample for speed
    shap_values = explainer.shap_values(shap_sample)
    shap_importance = dict(zip(features, np.abs(shap_values).mean(axis=0).tolist()))
    with open("/content/ipts/models/shap_importance.json", "w") as f:
        json.dump(shap_importance, f, indent=2)
    print(f"done ({time.time()-t0:.1f}s)")
except Exception as e:
    print(f"skipped ({e})")
    shap_importance = feat_importance  # fallback to RF importance

# ---- Graph Analysis (ULTRA-FAST: no simple_cycles, no iterative algorithms) ----
print("[ML] Building transaction graph for ring detection...")
t0 = time.time()

# Build edge weight table using pandas groupby (vectorized, no Python loop)
edge_counts = df.groupby(['sender_id', 'receiver_id']).size().reset_index(name='weight')
edge_counts = edge_counts[edge_counts['sender_id'] != edge_counts['receiver_id']]  # drop self-loops

G = nx.from_pandas_edgelist(
    edge_counts, source='sender_id', target='receiver_id',
    edge_attr='weight', create_using=nx.DiGraph()
)
print(f"  Graph built: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges ({time.time()-t0:.1f}s)")

# PageRank — use personalization=None and tol=1e-4 for fast convergence
print("  Computing PageRank...", end=" ", flush=True)
t0 = time.time()
try:
    pagerank = nx.pagerank(G, alpha=0.85, max_iter=30, tol=1e-4)
except nx.PowerIterationFailedConvergence:
    pagerank = {n: 1.0 / G.number_of_nodes() for n in G.nodes()}
print(f"done ({time.time()-t0:.1f}s)")

# Community detection — connected components (instant, O(V+E))
print("  Detecting communities...", end=" ", flush=True)
t0 = time.time()
communities = list(nx.weakly_connected_components(G))
node_to_community = {}
for i, comm in enumerate(communities):
    for node in comm:
        node_to_community[int(node)] = i
print(f"{len(communities)} communities ({time.time()-t0:.1f}s)")

# Cycle approximation — DO NOT use nx.simple_cycles (NP-hard, will hang)
# Instead: find strongly connected components with size >= 3 (guaranteed to contain cycles)
# Then sample representative paths within each SCC as "approximate cycles"
print("  Detecting laundering rings (SCC method)...", end=" ", flush=True)
t0 = time.time()
cycles_found = []
for scc in nx.strongly_connected_components(G):
    if len(scc) >= 3:
        scc_list = sorted(scc)[:8]  # cap at 8 nodes
        cycles_found.append([int(n) for n in scc_list])
    if len(cycles_found) >= 20:
        break
print(f"{len(cycles_found)} rings ({time.time()-t0:.1f}s)")

# Build JSON data for frontend D3 visualization — limit to top 150 nodes by PageRank
top_nodes = sorted(pagerank, key=pagerank.get, reverse=True)[:150]
top_set = set(top_nodes)
graph_data = {
    'nodes': [
        {'id': int(n), 'pagerank': float(pagerank.get(n, 0)), 'community': node_to_community.get(int(n), -1)}
        for n in top_nodes
    ],
    'edges': [
        {'source': int(u), 'target': int(v), 'weight': int(d.get('weight', 1))}
        for u, v, d in G.edges(data=True)
        if int(u) in top_set and int(v) in top_set
    ],
    'cycles': cycles_found[:20],
    'communities': len(communities),
}

with open("/content/ipts/models/graph_data.json", "w") as f:
    json.dump(graph_data, f)
joblib.dump(pagerank, "/content/ipts/models/pagerank.pkl")
print(f"  Graph analysis total: {time.time()-t0:.1f}s")

print(f"[PHASE 3] Complete. All 5 models saved to /content/ipts/models/\n")

# ============================================================
# PHASE 4 - SMART CONTRACT COMPILATION
# ============================================================
print("[PHASE 4] Smart Contract Compilation...")

from solcx import install_solc, compile_standard

print("  Installing solc 0.8.21...", end=" ", flush=True)
install_solc("0.8.21")
print("done")

contracts_source = {}

# Contract 1: IPTS_Enterprise_Settlement (Hardened)
contracts_source["IPTS_Enterprise_Settlement.sol"] = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract IPTS_Enterprise_Settlement {
    // === Reentrancy Guard ===
    uint256 private _locked = 1;
    modifier nonReentrant() {
        require(_locked == 1, "Reentrant call");
        _locked = 2;
        _;
        _locked = 1;
    }

    // === Access Control ===
    address public admin;
    mapping(address => bool) public authorizedSettlers;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }
    modifier onlyAuthorized() {
        require(authorizedSettlers[msg.sender] || msg.sender == admin, "Not authorized");
        _;
    }

    struct SettlementRecord {
        address sender;
        address receiver;
        uint256 amount;
        bytes32 iso20022Hash;
        uint256 timestamp;
        bool completed;
        uint8 riskScore;
        string currency;
    }

    mapping(address => uint256) public nostroBalances;
    mapping(bytes32 => SettlementRecord) public settlements;
    uint256 public totalSettlements;
    uint256 public totalVolume;

    event SettlementExecuted(
        bytes32 indexed txHash, address sender, address receiver,
        uint256 amount, bytes32 iso20022Hash, uint8 riskScore
    );
    event LiquidityInjected(address indexed bank, uint256 amount);
    event SettlerAuthorized(address indexed settler);
    event SettlerRevoked(address indexed settler);

    constructor() {
        admin = msg.sender;
        authorizedSettlers[msg.sender] = true;
    }

    function authorizeSettler(address settler) external onlyAdmin {
        authorizedSettlers[settler] = true;
        emit SettlerAuthorized(settler);
    }

    function revokeSettler(address settler) external onlyAdmin {
        authorizedSettlers[settler] = false;
        emit SettlerRevoked(settler);
    }

    function injectLiquidity(address bank) external payable {
        require(msg.value > 0, "Must send ETH");
        nostroBalances[bank] += msg.value;
        emit LiquidityInjected(bank, msg.value);
    }

    function executeAtomicSwap(
        address payable receiver,
        bytes32 iso20022Hash,
        uint8 riskScore
    ) external payable nonReentrant onlyAuthorized {
        require(msg.value > 0, "Must send value");
        require(receiver != address(0), "Invalid receiver");
        require(receiver != msg.sender, "Cannot send to self");
        require(nostroBalances[msg.sender] >= msg.value, "Insufficient nostro balance");

        nostroBalances[msg.sender] -= msg.value;

        // Use call instead of transfer (no 2300 gas limit)
        (bool success, ) = receiver.call{value: msg.value}("");
        require(success, "ETH transfer failed");

        bytes32 txHash = keccak256(
            abi.encodePacked(msg.sender, receiver, msg.value, iso20022Hash, block.timestamp, totalSettlements)
        );

        settlements[txHash] = SettlementRecord({
            sender: msg.sender,
            receiver: receiver,
            amount: msg.value,
            iso20022Hash: iso20022Hash,
            timestamp: block.timestamp,
            completed: true,
            riskScore: riskScore,
            currency: "USD"
        });

        totalSettlements++;
        totalVolume += msg.value;

        emit SettlementExecuted(txHash, msg.sender, receiver, msg.value, iso20022Hash, riskScore);
    }

    function getSettlement(bytes32 txHash) external view returns (SettlementRecord memory) {
        return settlements[txHash];
    }

    function getNostroBalance(address bank) external view returns (uint256) {
        return nostroBalances[bank];
    }

    function getStats() external view returns (uint256 _totalSettlements, uint256 _totalVolume) {
        return (totalSettlements, totalVolume);
    }
}
"""

# Contract 2: ComplianceOracle
contracts_source["ComplianceOracle.sol"] = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract ComplianceOracle {
    address public owner;
    mapping(address => bool) public sanctionsList;

    event SanctionsAdded(address indexed entity);
    event SanctionsRemoved(address indexed entity);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addToSanctionsList(address entity) external onlyOwner {
        sanctionsList[entity] = true;
        emit SanctionsAdded(entity);
    }

    function removeFromSanctionsList(address entity) external onlyOwner {
        sanctionsList[entity] = false;
        emit SanctionsRemoved(entity);
    }

    function isScreened(address entity) external view returns (bool) {
        return sanctionsList[entity];
    }
}
"""

# Contract 3: MultiSigApproval
contracts_source["MultiSigApproval.sol"] = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract MultiSigApproval {
    struct Transaction {
        address destination;
        uint256 value;
        bytes data;
        bool executed;
        uint256 approvalCount;
    }

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public requiredApprovals;

    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public approvals;

    event TransactionSubmitted(uint256 indexed txId, address indexed submitter);
    event TransactionApproved(uint256 indexed txId, address indexed approver);
    event TransactionExecuted(uint256 indexed txId);

    constructor(address[] memory _owners, uint256 _required) {
        require(_owners.length > 0, "Owners required");
        require(_required > 0 && _required <= _owners.length, "Invalid required count");
        for (uint256 i = 0; i < _owners.length; i++) {
            isOwner[_owners[i]] = true;
        }
        owners = _owners;
        requiredApprovals = _required;
    }

    modifier onlyOwners() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }

    function submitTransaction(address _dest, uint256 _value, bytes memory _data) external onlyOwners returns (uint256) {
        uint256 txId = transactions.length;
        transactions.push(Transaction({
            destination: _dest,
            value: _value,
            data: _data,
            executed: false,
            approvalCount: 0
        }));
        emit TransactionSubmitted(txId, msg.sender);
        return txId;
    }

    function approveTransaction(uint256 _txId) external onlyOwners {
        require(_txId < transactions.length, "Tx does not exist");
        require(!approvals[_txId][msg.sender], "Already approved");
        require(!transactions[_txId].executed, "Already executed");

        approvals[_txId][msg.sender] = true;
        transactions[_txId].approvalCount += 1;
        emit TransactionApproved(_txId, msg.sender);
    }

    function executeTransaction(uint256 _txId) external onlyOwners {
        Transaction storage txn = transactions[_txId];
        require(!txn.executed, "Already executed");
        require(txn.approvalCount >= requiredApprovals, "Not enough approvals");

        txn.executed = true;
        (bool success, ) = txn.destination.call{value: txn.value}(txn.data);
        require(success, "Execution failed");
        emit TransactionExecuted(_txId);
    }

    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }
}
"""

# Contract 4: AuditTrail
contracts_source["AuditTrail.sol"] = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract AuditTrail {
    struct AuditEntry {
        bytes32 eventType;
        bytes32 dataHash;
        address actor;
        uint256 timestamp;
        uint256 blockNumber;
    }

    AuditEntry[] public entries;

    event AuditLogged(uint256 indexed index, bytes32 eventType, address actor);

    function logEvent(bytes32 eventType, bytes32 dataHash, address actor) external {
        uint256 idx = entries.length;
        entries.push(AuditEntry({
            eventType: eventType,
            dataHash: dataHash,
            actor: actor,
            timestamp: block.timestamp,
            blockNumber: block.number
        }));
        emit AuditLogged(idx, eventType, actor);
    }

    function getAuditEntry(uint256 index) external view returns (
        bytes32 eventType,
        bytes32 dataHash,
        address actor,
        uint256 timestamp,
        uint256 blockNumber
    ) {
        require(index < entries.length, "Index out of bounds");
        AuditEntry memory e = entries[index];
        return (e.eventType, e.dataHash, e.actor, e.timestamp, e.blockNumber);
    }

    function getEntryCount() external view returns (uint256) {
        return entries.length;
    }
}
"""

# Contract 5: LiquidityPool
contracts_source["LiquidityPool.sol"] = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract LiquidityPool {
    struct Pool {
        uint256 balance;
        uint256 exchangeRate; // in basis points (10000 = 1:1)
    }

    mapping(bytes32 => Pool) public pools;
    mapping(bytes32 => mapping(address => uint256)) public providerBalances;

    event LiquidityAdded(bytes32 indexed poolId, address provider, uint256 amount);
    event LiquidityRemoved(bytes32 indexed poolId, address provider, uint256 amount);
    event Swapped(bytes32 indexed fromPool, bytes32 indexed toPool, uint256 amountIn, uint256 amountOut);

    function addLiquidity(bytes32 poolId) external payable {
        require(msg.value > 0, "Must send ETH");
        pools[poolId].balance += msg.value;
        providerBalances[poolId][msg.sender] += msg.value;
        if (pools[poolId].exchangeRate == 0) {
            pools[poolId].exchangeRate = 10000;
        }
        emit LiquidityAdded(poolId, msg.sender, msg.value);
    }

    function removeLiquidity(bytes32 poolId, uint256 amount) external {
        require(providerBalances[poolId][msg.sender] >= amount, "Insufficient balance");
        require(pools[poolId].balance >= amount, "Pool insufficient");

        pools[poolId].balance -= amount;
        providerBalances[poolId][msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit LiquidityRemoved(poolId, msg.sender, amount);
    }

    function setExchangeRate(bytes32 poolId, uint256 rate) external {
        require(rate > 0, "Rate must be positive");
        pools[poolId].exchangeRate = rate;
    }

    function swap(bytes32 fromPool, bytes32 toPool, uint256 amountIn) external payable {
        require(pools[fromPool].exchangeRate > 0, "From pool not initialized");
        require(pools[toPool].exchangeRate > 0, "To pool not initialized");

        uint256 amountOut = (amountIn * pools[toPool].exchangeRate) / pools[fromPool].exchangeRate;
        require(pools[toPool].balance >= amountOut, "Insufficient liquidity");

        pools[fromPool].balance += amountIn;
        pools[toPool].balance -= amountOut;

        payable(msg.sender).transfer(amountOut);
        emit Swapped(fromPool, toPool, amountIn, amountOut);
    }

    function getPoolInfo(bytes32 poolId) external view returns (uint256 balance, uint256 exchangeRate) {
        return (pools[poolId].balance, pools[poolId].exchangeRate);
    }
}
"""

# Contract 6: IPTS_Stablecoin (ERC-20 mock USDC)
contracts_source["IPTS_Stablecoin.sol"] = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract IPTS_Stablecoin {
    string public name = "IPTS USD Coin";
    string public symbol = "IUSD";
    uint8 public decimals = 6;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public minter;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);

    constructor() {
        minter = msg.sender;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "Only minter");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }

    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
"""

# Contract 7: HTLC (Hash Time-Locked Contract)
contracts_source["HTLC.sol"] = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract HTLC {
    struct Lock {
        address sender;
        address receiver;
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock;
        bool withdrawn;
        bool refunded;
        bytes32 preimage;
    }

    mapping(bytes32 => Lock) public locks;

    event Locked(bytes32 indexed lockId, address sender, address receiver, uint256 amount, bytes32 hashlock, uint256 timelock);
    event Withdrawn(bytes32 indexed lockId, bytes32 preimage);
    event Refunded(bytes32 indexed lockId);

    function createLock(address receiver, bytes32 hashlock, uint256 timelock) external payable returns (bytes32) {
        require(msg.value > 0, "Must send ETH");
        require(timelock > block.timestamp, "Timelock must be future");

        bytes32 lockId = keccak256(abi.encodePacked(msg.sender, receiver, msg.value, hashlock, timelock));
        require(locks[lockId].amount == 0, "Lock exists");

        locks[lockId] = Lock({
            sender: msg.sender, receiver: receiver, amount: msg.value,
            hashlock: hashlock, timelock: timelock,
            withdrawn: false, refunded: false, preimage: bytes32(0)
        });

        emit Locked(lockId, msg.sender, receiver, msg.value, hashlock, timelock);
        return lockId;
    }

    function withdraw(bytes32 lockId, bytes32 preimage) external {
        Lock storage lock = locks[lockId];
        require(lock.amount > 0, "Lock not found");
        require(!lock.withdrawn, "Already withdrawn");
        require(!lock.refunded, "Already refunded");
        require(lock.receiver == msg.sender, "Not receiver");
        require(keccak256(abi.encodePacked(preimage)) == lock.hashlock, "Invalid preimage");

        lock.withdrawn = true;
        lock.preimage = preimage;
        (bool ok, ) = payable(msg.sender).call{value: lock.amount}("");
        require(ok, "Transfer failed");

        emit Withdrawn(lockId, preimage);
    }

    function refund(bytes32 lockId) external {
        Lock storage lock = locks[lockId];
        require(lock.amount > 0, "Lock not found");
        require(!lock.withdrawn, "Already withdrawn");
        require(!lock.refunded, "Already refunded");
        require(lock.sender == msg.sender, "Not sender");
        require(block.timestamp >= lock.timelock, "Too early");

        lock.refunded = true;
        (bool ok, ) = payable(msg.sender).call{value: lock.amount}("");
        require(ok, "Transfer failed");

        emit Refunded(lockId);
    }

    function getLock(bytes32 lockId) external view returns (Lock memory) {
        return locks[lockId];
    }
}
"""

# Compile all contracts
compiled_contracts = {}
for filename, source in contracts_source.items():
    contract_name = filename.replace(".sol", "")
    print(f"  Compiling {contract_name}...", end=" ", flush=True)

    # Build input for the compiler
    compiler_input = {
        "language": "Solidity",
        "sources": {filename: {"content": source}},
        "settings": {
            "outputSelection": {
                "*": {"*": ["abi", "evm.bytecode"]}
            },
            "optimizer": {"enabled": True, "runs": 200}
        }
    }

    try:
        compiled = compile_standard(compiler_input, solc_version="0.8.21")
        contract_data = compiled["contracts"][filename][contract_name]
        abi = contract_data["abi"]
        bytecode = contract_data["evm"]["bytecode"]["object"]

        compiled_contracts[contract_name] = {
            "abi": abi,
            "bytecode": bytecode
        }

        # Save ABI and bytecode
        with open(f"/content/ipts/contracts/{contract_name}_abi.json", "w") as f:
            json.dump(abi, f, indent=2)
        with open(f"/content/ipts/contracts/{contract_name}_bytecode.txt", "w") as f:
            f.write(bytecode)

        print(f"OK (ABI: {len(abi)} functions)")
    except Exception as e:
        print(f"ERROR: {e}")

# Save all compiled contracts as one bundle
with open("/content/ipts/contracts/compiled_bundle.json", "w") as f:
    json.dump(compiled_contracts, f)

print(f"[PHASE 4] Complete. {len(compiled_contracts)} contracts compiled.\n")

# ============================================================
# PHASE 5 - FRONTEND
# ============================================================
print("[PHASE 5] Frontend Setup...")

frontend_src = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ipts_frontend.html")
frontend_dst = "/content/ipts/templates/index.html"

if os.path.exists(frontend_src):
    shutil.copy2(frontend_src, frontend_dst)
    print(f"  Copied {frontend_src} -> {frontend_dst}")
else:
    # Try alternate locations
    alt_paths = [
        "/content/ipts_frontend.html",
        "/content/drive/MyDrive/ipts_frontend.html",
        "ipts_frontend.html",
    ]
    copied = False
    for p in alt_paths:
        if os.path.exists(p):
            shutil.copy2(p, frontend_dst)
            print(f"  Copied {p} -> {frontend_dst}")
            copied = True
            break
    if not copied:
        print(f"  WARNING: Frontend HTML not found. Upload ipts_frontend.html to Colab.")
        # Write a placeholder
        with open(frontend_dst, "w") as f:
            f.write("<html><body><h1>IPTS - Upload ipts_frontend.html</h1></body></html>")

print("[PHASE 5] Complete.\n")

# ============================================================
# PHASE 6 - FLASK BACKEND
# ============================================================
print("[PHASE 6] Writing Flask Backend (app.py)...")

APP_PY = r'''#!/usr/bin/env python3
"""
IPTS Flask Backend - Enterprise Settlement API
Zero Trust Architecture | JWT Auth | AML Risk Engine | Blockchain Manager
"""

import os
import sys
import json
import time
import uuid
import hashlib
import sqlite3
import logging
import threading
from datetime import datetime, timedelta
from functools import wraps

import jwt
import joblib
import numpy as np
import networkx as nx
from flask import Flask, request, jsonify, render_template, Response, g
from web3 import Web3

# ============================================================
# Configuration
# ============================================================
APP_SECRET = os.environ.get("IPTS_SECRET_KEY", "ipts_enterprise_secret_2026_xK9mPq_CHANGE_IN_PRODUCTION")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 1
DB_PATH = "/content/ipts/ipts_vault.db"
MODELS_DIR = "/content/ipts/models"
CONTRACTS_DIR = "/content/ipts/contracts"
LOG_DIR = "/content/ipts/logs"

# Fixed conversion rate for USD/ETH display
ETH_USD_RATE = 3500.0

# User login accounts — username is a real name-based handle
USERS = {
    "mohamad":      {"password": "Mohamad@2026!",    "role": "admin"},
    "rohit":        {"password": "Rohit@2026!",      "role": "operator"},
    "sriram":       {"password": "Sriram@2026!",     "role": "auditor"},
    "walid":        {"password": "Walid@2026!",      "role": "compliance"},
    "vibin":        {"password": "Vibin@2026!",      "role": "datascientist"},
}

# User accounts with balances
USER_ACCOUNTS = {
    "mohamad":      {"full_name": "Mohamad Idriss",            "balance": 1000000.00, "currency": "USD", "wallet_idx": 0},
    "rohit":        {"full_name": "Rohit Jacob Isaac",         "balance": 750000.00,  "currency": "USD", "wallet_idx": 1},
    "sriram":       {"full_name": "Sriram Acharya Mudumbai",   "balance": 500000.00,  "currency": "USD", "wallet_idx": 2},
    "walid":        {"full_name": "Walid Elmahdy",             "balance": 350000.00,  "currency": "USD", "wallet_idx": 3},
    "vibin":        {"full_name": "Vibin Chandrabose",         "balance": 150000.00,  "currency": "USD", "wallet_idx": 4},
}

# Beneficiaries list (legit + suspicious for testing)
BENEFICIARIES = [
    {"name": "Mohamad Idriss", "type": "individual", "risk": "low"},
    {"name": "Rohit Jacob Isaac", "type": "individual", "risk": "low"},
    {"name": "Sriram Acharya Mudumbai", "type": "individual", "risk": "low"},
    {"name": "Walid Elmahdy", "type": "individual", "risk": "low"},
    {"name": "Vibin Chandrabose", "type": "individual", "risk": "low"},
    {"name": "Global Trade Corp", "type": "corporate", "risk": "low"},
    {"name": "Acme International", "type": "corporate", "risk": "low"},
    {"name": "Tehran Petroleum Exports", "type": "corporate", "risk": "high"},
    {"name": "Shell Company Alpha", "type": "corporate", "risk": "critical"},
    {"name": "Offshore Haven Corp", "type": "corporate", "risk": "critical"},
    {"name": "Dark Web Exchange", "type": "corporate", "risk": "critical"},
    {"name": "Phantom Bank Ltd", "type": "corporate", "risk": "high"},
    {"name": "Hawala Underground Services", "type": "corporate", "risk": "critical"},
    {"name": "Arms Dealer International", "type": "corporate", "risk": "critical"},
    {"name": "Narco Laundry Inc", "type": "corporate", "risk": "critical"},
]

# AML Watchlist entities
WATCHLIST_ENTITIES = [
    "dark web exchange", "shell company alpha", "offshore haven corp",
    "money mule network", "terror finance ltd", "narco laundry inc",
    "sanctions evader llc", "fraud syndicate global", "phantom bank",
    "hawala underground", "conflict minerals co", "arms dealer intl",
    "tehran petroleum", "arms dealer international", "hawala underground services",
]

# ============================================================
# Multi-Currency FX Engine
# ============================================================
class FXEngine:
    """Real-time FX rate engine with spread management."""
    RATES = {
        "USD/EUR": 0.9234, "USD/GBP": 0.7891, "USD/JPY": 151.42,
        "USD/CHF": 0.8812, "USD/AED": 3.6725, "USD/SGD": 1.3456,
        "USD/HKD": 7.8265, "USD/CAD": 1.3678, "USD/AUD": 1.5234,
        "USD/INR": 83.42, "USD/CNY": 7.2456, "USD/SAR": 3.7500,
        "EUR/USD": 1.0830, "GBP/USD": 1.2673, "EUR/GBP": 0.8548,
    }
    SPREADS = {
        "USD/EUR": 0.0005, "USD/GBP": 0.0008, "USD/JPY": 0.02,
        "USD/AED": 0.0002, "USD/INR": 0.05, "USD/CNY": 0.01,
    }
    SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "AED", "SGD", "HKD", "CAD", "AUD", "INR", "CNY", "SAR"]

    @classmethod
    def get_rate(cls, from_ccy, to_ccy, include_spread=True):
        if from_ccy == to_ccy:
            return 1.0
        pair = f"{from_ccy}/{to_ccy}"
        reverse_pair = f"{to_ccy}/{from_ccy}"
        if pair in cls.RATES:
            rate = cls.RATES[pair]
            spread = cls.SPREADS.get(pair, 0.001) if include_spread else 0
            return rate + spread
        elif reverse_pair in cls.RATES:
            rate = 1.0 / cls.RATES[reverse_pair]
            spread = cls.SPREADS.get(reverse_pair, 0.001) if include_spread else 0
            return rate + spread
        # Cross via USD
        if from_ccy != "USD" and to_ccy != "USD":
            usd_from = cls.get_rate(from_ccy, "USD", include_spread)
            usd_to = cls.get_rate("USD", to_ccy, include_spread)
            return usd_from * usd_to
        return None

    @classmethod
    def convert(cls, amount, from_ccy, to_ccy):
        rate = cls.get_rate(from_ccy, to_ccy)
        if rate is None:
            return None, None
        return round(amount * rate, 2), rate

    @classmethod
    def get_all_rates(cls, base="USD"):
        rates = {}
        for ccy in cls.SUPPORTED_CURRENCIES:
            if ccy != base:
                rate = cls.get_rate(base, ccy, include_spread=False)
                if rate:
                    rates[f"{base}/{ccy}"] = round(rate, 4)
        return rates

fx_engine = FXEngine()

# ============================================================
# ISO 20022 Message Generator
# ============================================================
class ISO20022Generator:
    """Generate real pacs.008 FI-to-FI Customer Credit Transfer messages."""

    @staticmethod
    def generate_pacs008(settlement_id, sender_name, sender_bic, receiver_name,
                          receiver_bic, amount, currency, beneficiary_name):
        now = datetime.utcnow()
        msg_id = f"IPTS{now.strftime('%Y%m%d%H%M%S')}{settlement_id[:8]}"
        xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>{msg_id}</MsgId>
      <CreDtTm>{now.strftime('%Y-%m-%dT%H:%M:%S')}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>{settlement_id}</InstrId>
        <EndToEndId>{settlement_id}</EndToEndId>
        <UETR>{str(uuid.uuid4())}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="{currency}">{amount:.2f}</IntrBkSttlmAmt>
      <IntrBkSttlmDt>{now.strftime('%Y-%m-%d')}</IntrBkSttlmDt>
      <ChrgBr>SHAR</ChrgBr>
      <InstgAgt><FinInstnId><BICFI>{sender_bic}</BICFI></FinInstnId></InstgAgt>
      <InstdAgt><FinInstnId><BICFI>{receiver_bic}</BICFI></FinInstnId></InstdAgt>
      <Dbtr><Nm>{sender_name}</Nm></Dbtr>
      <DbtrAgt><FinInstnId><BICFI>{sender_bic}</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>{receiver_bic}</BICFI></FinInstnId></CdtrAgt>
      <Cdtr><Nm>{beneficiary_name}</Nm></Cdtr>
      <RmtInf><Ustrd>IPTS Settlement {settlement_id[:8]}</Ustrd></RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>"""
        return xml, msg_id

iso20022 = ISO20022Generator()

# BIC codes for users
USER_BIC_CODES = {
    "mohamad": "IPTSUSDM001", "rohit": "IPTSUSDM002", "sriram": "IPTSUSDM003",
    "walid": "IPTSUSDM004", "vibin": "IPTSUSDM005",
}

# ============================================================
# Real-Time Velocity Tracker (Feature Store)
# ============================================================
class VelocityTracker:
    """Track transaction velocity per sender for real-time ML features."""

    def __init__(self):
        self._store = {}  # {sender: [(timestamp, amount), ...]}

    def record(self, sender, amount):
        if sender not in self._store:
            self._store[sender] = []
        self._store[sender].append((time.time(), float(amount)))
        # Keep only last 7 days
        cutoff = time.time() - 7 * 86400
        self._store[sender] = [(t, a) for t, a in self._store[sender] if t > cutoff]

    def get_features(self, sender):
        txns = self._store.get(sender, [])
        now = time.time()
        h1 = sum(a for t, a in txns if now - t < 3600)
        h24 = sum(a for t, a in txns if now - t < 86400)
        d7 = sum(a for t, a in txns if now - t < 604800)
        count_24h = sum(1 for t, a in txns if now - t < 86400)
        amounts = [a for _, a in txns] or [0]
        avg = np.mean(amounts)
        std = np.std(amounts) if len(amounts) > 1 else 0
        return {
            "velocity_1h": h1, "velocity_24h": h24, "velocity_7d": d7,
            "count_24h": count_24h, "avg_tx_amount": avg, "std_tx_amount": std,
        }

velocity_tracker = VelocityTracker()

# Rate limiting
RATE_LIMIT = {}
RATE_LIMIT_MAX = 100  # requests per minute per IP
RATE_LIMIT_WINDOW = 60

# ============================================================
# Flask App Setup
# ============================================================
app = Flask(__name__, template_folder="/content/ipts/templates")
app.config['SECRET_KEY'] = APP_SECRET

logging.basicConfig(
    filename=os.path.join(LOG_DIR, "ipts_api.log"),
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("IPTS")

# ============================================================
# Database Setup
# ============================================================
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS pii_vault (
        id TEXT PRIMARY KEY,
        data_hash TEXT NOT NULL,
        encrypted_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        gdpr_consent INTEGER DEFAULT 1
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS settlements (
        id TEXT PRIMARY KEY,
        sender TEXT,
        receiver TEXT,
        amount REAL,
        currency TEXT DEFAULT 'USD',
        risk_score REAL,
        status TEXT,
        tx_hash TEXT,
        iso20022_hash TEXT,
        beneficiary_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        settlement_time_ms INTEGER,
        sender_username TEXT,
        receiver_username TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS hitl_queue (
        id TEXT PRIMARY KEY,
        settlement_id TEXT,
        reason TEXT,
        risk_score REAL,
        amount REAL,
        sender TEXT,
        receiver TEXT,
        beneficiary_name TEXT,
        status TEXT DEFAULT 'pending',
        reviewed_by TEXT,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT,
        actor TEXT,
        details TEXT,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS sanctions_list (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_name TEXT UNIQUE,
        entity_type TEXT DEFAULT 'individual',
        added_by TEXT,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS swift_gpi_tracker (
        uetr TEXT PRIMARY KEY,
        settlement_id TEXT,
        status TEXT DEFAULT 'ACSP',
        originator TEXT,
        beneficiary TEXT,
        amount REAL,
        currency TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS user_accounts (
        username TEXT PRIMARY KEY,
        full_name TEXT,
        balance REAL,
        currency TEXT DEFAULT 'USD',
        wallet_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS compliance_cases (
        id TEXT PRIMARY KEY,
        case_number TEXT UNIQUE,
        settlement_id TEXT,
        case_type TEXT,
        severity TEXT,
        status TEXT DEFAULT 'open',
        assigned_to TEXT,
        description TEXT,
        risk_score REAL,
        amount REAL,
        sender_name TEXT,
        beneficiary_name TEXT,
        findings TEXT,
        resolution TEXT,
        regulatory_report_filed INTEGER DEFAULT 0,
        sar_number TEXT,
        sla_deadline TIMESTAMP,
        escalation_level INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS four_eyes_approvals (
        id TEXT PRIMARY KEY,
        hitl_id TEXT,
        first_approver TEXT,
        first_approved_at TIMESTAMP,
        second_approver TEXT,
        second_approved_at TIMESTAMP,
        required INTEGER DEFAULT 1,
        status TEXT DEFAULT 'pending'
    )""")
    conn.commit()
    conn.close()
    logger.info("Database initialized")

init_db()

def init_user_accounts(blockchain_accounts):
    """Initialize user_accounts table from USER_ACCOUNTS config."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    for username, info in USER_ACCOUNTS.items():
        wallet_idx = info["wallet_idx"]
        wallet_addr = blockchain_accounts[wallet_idx] if wallet_idx < len(blockchain_accounts) else ""
        c.execute("SELECT username FROM user_accounts WHERE username = ?", (username,))
        if not c.fetchone():
            c.execute("""INSERT INTO user_accounts (username, full_name, balance, currency, wallet_address)
                VALUES (?, ?, ?, ?, ?)""",
                (username, info["full_name"], info["balance"], info["currency"], wallet_addr))
        else:
            # Update wallet address if it changed
            c.execute("UPDATE user_accounts SET wallet_address = ? WHERE username = ?",
                      (wallet_addr, username))
    conn.commit()
    conn.close()

def get_user_balance(username):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT balance FROM user_accounts WHERE username = ?", (username,))
    row = c.fetchone()
    conn.close()
    return row[0] if row else 0.0

def update_user_balance(username, new_balance):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE user_accounts SET balance = ?, updated_at = ? WHERE username = ?",
              (new_balance, datetime.utcnow().isoformat(), username))
    conn.commit()
    conn.close()

def get_user_account_info(username):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM user_accounts WHERE username = ?", (username,))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "username": row[0],
        "full_name": row[1],
        "balance": row[2],
        "currency": row[3],
        "wallet_address": row[4],
        "created_at": row[5],
        "updated_at": row[6],
    }

# Compliance case counter
_case_counter_lock = threading.Lock()
_case_counter = [0]

def generate_case_number():
    with _case_counter_lock:
        _case_counter[0] += 1
        return f"CASE-2026-{_case_counter[0]:04d}"

def map_reason_to_case_type(reasons):
    reasons_lower = " ".join(reasons).lower()
    if "watchlist" in reasons_lower or "sanctions" in reasons_lower:
        return "sanctions"
    if "structuring" in reasons_lower or "smurfing" in reasons_lower:
        return "structuring"
    if "high value" in reasons_lower:
        return "aml"
    if "ml ensemble" in reasons_lower:
        return "fraud"
    if "graph" in reasons_lower:
        return "aml"
    return "aml"

def severity_from_score(score):
    if score >= 90:
        return "critical"
    elif score >= 80:
        return "high"
    elif score >= 60:
        return "medium"
    return "low"

def sla_hours_for_severity(severity):
    return {"critical": 24, "high": 48, "medium": 72, "low": 168}.get(severity, 72)

def create_compliance_case_for_blocked(settlement_id, risk_result, amount, sender_name, beneficiary_name):
    """Auto-create a compliance case when a transaction is blocked."""
    case_id = str(uuid.uuid4())
    case_number = generate_case_number()
    case_type = map_reason_to_case_type(risk_result["reasons"])
    severity = severity_from_score(risk_result["composite_score"])

    description = f"Auto-generated case for blocked transaction. Amount: ${amount:,.2f}. "
    description += "Reasons: " + "; ".join(risk_result["reasons"])

    sla_hours = sla_hours_for_severity(severity)
    sla_deadline = (datetime.utcnow() + timedelta(hours=sla_hours)).isoformat()

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""INSERT INTO compliance_cases
        (id, case_number, settlement_id, case_type, severity, status, description,
         risk_score, amount, sender_name, beneficiary_name, sla_deadline)
        VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?)""",
        (case_id, case_number, settlement_id, case_type, severity, description,
         risk_result["composite_score"], amount, sender_name, beneficiary_name, sla_deadline))
    conn.commit()
    conn.close()
    return case_id, case_number

# ============================================================
# CORS & Security Headers
# ============================================================
@app.after_request
def add_security_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        resp = app.make_default_options_response()
        return resp

# ============================================================
# Rate Limiting
# ============================================================
def check_rate_limit(ip):
    now = time.time()
    if ip not in RATE_LIMIT:
        RATE_LIMIT[ip] = []
    RATE_LIMIT[ip] = [t for t in RATE_LIMIT[ip] if now - t < RATE_LIMIT_WINDOW]
    if len(RATE_LIMIT[ip]) >= RATE_LIMIT_MAX:
        return False
    RATE_LIMIT[ip].append(now)
    return True

# ============================================================
# JWT / Zero Trust Auth
# ============================================================
def generate_token(username, role):
    payload = {
        "sub": username,
        "role": role,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, APP_SECRET, algorithm=JWT_ALGORITHM)

def zero_trust_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Rate limit check
        client_ip = request.remote_addr or "unknown"
        if not check_rate_limit(client_ip):
            return jsonify({"error": "Rate limit exceeded"}), 429

        # JWT check
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split("Bearer ")[-1].strip()
        try:
            payload = jwt.decode(token, APP_SECRET, algorithms=[JWT_ALGORITHM])
            request.user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)
    return decorated

# ============================================================
# AML Risk Engine (FIXED: Rule-based overrides for blocking)
# ============================================================
class AML_Risk_Engine:
    def __init__(self):
        self.models_loaded = False
        self.iso_forest = None
        self.rf_clf = None
        self.xgb_clf = None
        self.autoencoder = None
        self.ae_threshold = 0
        self.pagerank = {}
        self.graph_data = {}
        self._last_shap = None
        self._load_models()

    def _load_models(self):
        try:
            self.iso_forest = joblib.load(os.path.join(MODELS_DIR, "isolation_forest.pkl"))
            self.rf_clf = joblib.load(os.path.join(MODELS_DIR, "random_forest.pkl"))
            self.xgb_clf = joblib.load(os.path.join(MODELS_DIR, "xgboost.pkl"))
            self.autoencoder = joblib.load(os.path.join(MODELS_DIR, "autoencoder.pkl"))
            self.ae_threshold = joblib.load(os.path.join(MODELS_DIR, "ae_threshold.pkl"))
            self.pagerank = joblib.load(os.path.join(MODELS_DIR, "pagerank.pkl"))
            with open(os.path.join(MODELS_DIR, "graph_data.json")) as f:
                self.graph_data = json.load(f)
            self.models_loaded = True
            logger.info("All 4 ML models loaded successfully")
        except Exception as e:
            logger.error(f"Model loading error: {e}")
            self.models_loaded = False

    def score_transaction(self, amount, hour, day, freq, is_round, country_risk,
                          sender, receiver, beneficiary_name=""):
        # Get velocity features for sender
        vf = velocity_tracker.get_features(str(sender))
        avg_amt = vf["avg_tx_amount"]
        std_amt = vf["std_tx_amount"]
        amount_zscore = (amount - avg_amt) / (std_amt + 1e-6) if std_amt > 0 else 0
        unique_receivers = min(freq, 20)  # approximate
        is_new_receiver = 1 if freq <= 1 else 0

        # Full 16-feature vector matching training data
        features = np.array([[amount, hour, day, freq, is_round, country_risk, sender, receiver,
                              vf["velocity_1h"], vf["velocity_24h"], vf["velocity_7d"],
                              avg_amt, std_amt, amount_zscore, unique_receivers, is_new_receiver]])
        scores = {}
        reasons = []

        # Track force-override triggers
        force_composite = None

        # === Rule-based checks (30% weight) ===
        rule_score = 0
        if amount > 500000:
            rule_score += 70
            reasons.append(f"Very high value transaction (>${amount:,.0f})")
            force_composite = max(force_composite or 0, 95)
        elif amount > 100000:
            rule_score += 50
            reasons.append(f"AML threshold breach: >${amount:,.0f} exceeds $100K reporting limit")
            force_composite = max(force_composite or 0, 85)
        if 9000 <= amount <= 9999:
            rule_score += 60
            reasons.append("Structuring/smurfing pattern ($9K-$9.9K)")
            if freq > 10:
                force_composite = max(force_composite or 0, 85)
                reasons.append(f"Structuring with high frequency ({freq} txns/7d)")
        if is_round and amount > 10000:
            rule_score += 20
            reasons.append("Suspicious round amount")
        if country_risk > 0.7:
            rule_score += 25
            reasons.append(f"High-risk jurisdiction (risk={country_risk:.2f})")
            if amount > 100000:
                force_composite = max(force_composite or 0, 85)
                reasons.append("High value + high-risk jurisdiction combo")
        if freq > 30:
            rule_score += 15
            reasons.append(f"High frequency ({freq} txns/7d)")
        rule_score = min(rule_score, 100)
        scores['rules'] = rule_score

        # === ML Ensemble (40% weight) ===
        ml_score = 0
        if self.models_loaded:
            try:
                # Isolation Forest
                iso_pred = 1 if self.iso_forest.predict(features)[0] == -1 else 0
                iso_score_raw = -self.iso_forest.score_samples(features)[0]
                iso_contrib = iso_score_raw * 100
                iso_contrib = min(max(iso_contrib, 0), 100)

                # Random Forest
                rf_prob = self.rf_clf.predict_proba(features)[0][1] * 100

                # XGBoost
                xgb_prob = self.xgb_clf.predict_proba(features)[0][1] * 100

                # Autoencoder
                recon = self.autoencoder.predict(features)
                recon_error = np.mean((features - recon) ** 2)
                ae_score = min((recon_error / max(self.ae_threshold, 1e-6)) * 50, 100)

                ml_score = (iso_contrib * 0.2 + rf_prob * 0.35 + xgb_prob * 0.35 + ae_score * 0.1)
                ml_score = min(max(ml_score, 0), 100)

                if ml_score > 50:
                    reasons.append(f"ML ensemble alert (score={ml_score:.1f})")

                # Per-transaction feature contributions (SHAP-like explainability)
                feature_names = ['amount', 'hour', 'day_of_week', 'freq_7d', 'is_round', 'country_risk',
                                 'sender_id', 'receiver_id', 'velocity_1h', 'velocity_24h', 'velocity_7d',
                                 'avg_tx_amount', 'std_tx_amount', 'amount_zscore', 'unique_receivers_7d', 'is_new_receiver']
                try:
                    import shap
                    explainer = shap.TreeExplainer(self.xgb_clf)
                    sv = explainer.shap_values(features)
                    self._last_shap = {fn: round(float(sv[0][i]), 4) for i, fn in enumerate(feature_names)}
                    logger.info(f"SHAP (real): {self._last_shap}")
                except Exception as shap_e:
                    logger.info(f"Real SHAP unavailable ({shap_e}), using RF fallback")
                    try:
                        fi = self.rf_clf.feature_importances_
                        feat_vals = features[0]
                        mean_vals = np.array([50000, 12, 3, 5, 0.5, 0.3, 250, 250,
                                              10000, 50000, 200000, 30000, 15000, 0, 5, 0.3])
                        deviations = (feat_vals - mean_vals) / (mean_vals + 1e-6)
                        contributions = fi * deviations
                        self._last_shap = {fn: round(float(contributions[i]), 4) for i, fn in enumerate(feature_names)}
                        logger.info(f"SHAP (fallback): {self._last_shap}")
                    except Exception as fb_e:
                        logger.warning(f"SHAP fallback also failed: {fb_e}")
                        self._last_shap = None

            except Exception as e:
                logger.error(f"ML scoring error: {e}")
                ml_score = 0
                self._last_shap = None
        else:
            self._last_shap = None
        scores['ml'] = ml_score

        # === NLP Watchlist (15% weight) ===
        nlp_score = 0
        if beneficiary_name:
            name_lower = beneficiary_name.lower()
            # Check against watchlist entities
            for entity in WATCHLIST_ENTITIES:
                if entity in name_lower or name_lower in entity:
                    nlp_score = 100
                    reasons.append(f"Watchlist match: {entity}")
                    force_composite = max(force_composite or 0, 95)
                    break
            # Check sanctions DB
            if nlp_score == 0:
                try:
                    conn = sqlite3.connect(DB_PATH)
                    c = conn.cursor()
                    c.execute("SELECT entity_name FROM sanctions_list WHERE LOWER(entity_name) LIKE ?",
                              (f"%{name_lower}%",))
                    match = c.fetchone()
                    conn.close()
                    if match:
                        nlp_score = 100
                        reasons.append(f"Sanctions list match: {match[0]}")
                        force_composite = max(force_composite or 0, 95)
                except Exception:
                    pass
        scores['nlp'] = nlp_score

        # === Graph Risk (15% weight) ===
        graph_score = 0
        sender_pr = self.pagerank.get(int(sender), 0) if self.pagerank else 0
        receiver_pr = self.pagerank.get(int(receiver), 0) if self.pagerank else 0
        max_pr = max(self.pagerank.values()) if self.pagerank else 1
        if max_pr > 0:
            centrality = max(sender_pr, receiver_pr) / max_pr
            graph_score = centrality * 100
            if graph_score > 50:
                reasons.append(f"High graph centrality ({graph_score:.1f})")
        scores['graph'] = graph_score

        # === Composite Score ===
        composite = (
            scores['rules'] * 0.30 +
            scores['ml'] * 0.40 +
            scores['nlp'] * 0.15 +
            scores['graph'] * 0.15
        )
        composite = min(max(composite, 0), 100)

        # OVERRIDE MECHANISM 1: Force composite for obvious cases
        if force_composite is not None and force_composite > composite:
            composite = force_composite

        # OVERRIDE MECHANISM 2: If ANY single score component >= 90, force composite to at least 80
        max_component = max(scores.values())
        if max_component >= 90 and composite < 80:
            composite = max(composite, 80)

        composite = min(composite, 100)

        # Decision
        if composite >= 80:
            decision = "blocked"
        elif composite >= 60:
            decision = "flagged"
        else:
            decision = "approved"

        return {
            "composite_score": round(composite, 2),
            "decision": decision,
            "scores": {k: round(v, 2) for k, v in scores.items()},
            "reasons": reasons,
            "shap_values": getattr(self, '_last_shap', None),
        }

# Initialize AML Engine
aml_engine = AML_Risk_Engine()

# ============================================================
# Blockchain Manager
# ============================================================
class BlockchainManager:
    def __init__(self):
        self.w3 = None
        self.contracts = {}
        self.deployed = {}
        self.accounts = []
        self._connect()

    def _connect(self):
        try:
            self.w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
            if self.w3.is_connected():
                self.accounts = self.w3.eth.accounts
                logger.info(f"Connected to Ganache. {len(self.accounts)} accounts available.")
                self._deploy_contracts()
                self._prefund()
                # Initialize user accounts with wallet addresses
                init_user_accounts(self.accounts)
            else:
                logger.error("Cannot connect to Ganache")
        except Exception as e:
            logger.error(f"Blockchain connection error: {e}")

    def _deploy_contracts(self):
        try:
            with open(os.path.join(CONTRACTS_DIR, "compiled_bundle.json")) as f:
                bundle = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load contract bundle: {e}")
            return

        deployer = self.accounts[0]

        for name, data in bundle.items():
            try:
                abi = data["abi"]
                bytecode = data["bytecode"]
                contract = self.w3.eth.contract(abi=abi, bytecode=bytecode)

                # Handle constructor args
                if name == "MultiSigApproval":
                    tx_hash = contract.constructor(
                        self.accounts[:3], 2
                    ).transact({"from": deployer, "gas": 3000000})
                else:
                    tx_hash = contract.constructor().transact({
                        "from": deployer, "gas": 3000000
                    })

                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
                deployed_contract = self.w3.eth.contract(
                    address=receipt.contractAddress, abi=abi
                )
                self.deployed[name] = deployed_contract
                logger.info(f"Deployed {name} at {receipt.contractAddress}")
            except Exception as e:
                logger.error(f"Failed to deploy {name}: {e}")

    def _prefund(self):
        """Pre-fund first account with 100 ETH as nostro liquidity"""
        if "IPTS_Enterprise_Settlement" not in self.deployed:
            return
        try:
            contract = self.deployed["IPTS_Enterprise_Settlement"]
            tx = contract.functions.injectLiquidity(self.accounts[0]).transact({
                "from": self.accounts[0],
                "value": self.w3.to_wei(100, "ether"),
                "gas": 200000
            })
            self.w3.eth.wait_for_transaction_receipt(tx)
            logger.info("Pre-funded 100 ETH nostro liquidity")
        except Exception as e:
            logger.error(f"Pre-funding error: {e}")

    def inject_liquidity(self, bank_address, amount_eth):
        if "IPTS_Enterprise_Settlement" not in self.deployed:
            return None
        try:
            contract = self.deployed["IPTS_Enterprise_Settlement"]
            tx = contract.functions.injectLiquidity(bank_address).transact({
                "from": self.accounts[0],
                "value": self.w3.to_wei(amount_eth, "ether"),
                "gas": 200000
            })
            receipt = self.w3.eth.wait_for_transaction_receipt(tx)
            return receipt.transactionHash.hex()
        except Exception as e:
            logger.error(f"Liquidity injection error: {e}")
            return None

    def execute_settlement(self, receiver_address, amount_eth, iso20022_hash, risk_score):
        if "IPTS_Enterprise_Settlement" not in self.deployed:
            return None
        try:
            contract = self.deployed["IPTS_Enterprise_Settlement"]
            sender = self.accounts[0]
            tx = contract.functions.executeAtomicSwap(
                Web3.to_checksum_address(receiver_address),
                iso20022_hash,
                min(int(risk_score), 255)
            ).transact({
                "from": sender,
                "value": self.w3.to_wei(amount_eth, "ether"),
                "gas": 300000
            })
            receipt = self.w3.eth.wait_for_transaction_receipt(tx)
            return {
                "tx_hash": receipt.transactionHash.hex(),
                "block_number": receipt.blockNumber,
                "gas_used": receipt.gasUsed,
                "status": "success" if receipt.status == 1 else "failed"
            }
        except Exception as e:
            logger.error(f"Settlement execution error: {e}")
            return None

    def get_nostro_balance(self, address=None):
        if "IPTS_Enterprise_Settlement" not in self.deployed:
            return 0
        try:
            contract = self.deployed["IPTS_Enterprise_Settlement"]
            addr = address or self.accounts[0]
            balance_wei = contract.functions.getNostroBalance(addr).call()
            return float(self.w3.from_wei(balance_wei, "ether"))
        except Exception as e:
            logger.error(f"Balance check error: {e}")
            return 0

    def get_settlement_record(self, tx_hash_hex):
        if "IPTS_Enterprise_Settlement" not in self.deployed:
            return None
        try:
            contract = self.deployed["IPTS_Enterprise_Settlement"]
            tx_hash_bytes = bytes.fromhex(tx_hash_hex.replace("0x", ""))
            record = contract.functions.getSettlement(tx_hash_bytes).call()
            return {
                "sender": record[0],
                "receiver": record[1],
                "amount": float(self.w3.from_wei(record[2], "ether")),
                "iso20022Hash": record[3].hex(),
                "timestamp": record[4],
                "completed": record[5],
                "riskScore": record[6],
            }
        except Exception as e:
            logger.error(f"Settlement record error: {e}")
            return None

# Initialize Blockchain Manager
blockchain = BlockchainManager()

# ============================================================
# Helper: Audit Logging
# ============================================================
def log_audit(event_type, actor, details, ip=""):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute(
            "INSERT INTO audit_log (event_type, actor, details, ip_address) VALUES (?, ?, ?, ?)",
            (event_type, actor, json.dumps(details) if isinstance(details, dict) else str(details), ip)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Audit log error: {e}")

# ============================================================
# SSE Stream Store
# ============================================================
sse_events = []

def push_sse(event_type, data):
    sse_events.append({
        "type": event_type,
        "data": data,
        "timestamp": datetime.utcnow().isoformat()
    })
    # Keep only last 200 events
    if len(sse_events) > 200:
        del sse_events[:100]

# ============================================================
# API ENDPOINTS
# ============================================================

# --- Login ---
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(force=True)
    username = data.get("username", "")
    password = data.get("password", "")

    user = USERS.get(username)
    if not user or user["password"] != password:
        log_audit("login_failed", username, {"reason": "invalid credentials"}, request.remote_addr)
        return jsonify({"error": "Invalid credentials"}), 401

    token = generate_token(username, user["role"])
    log_audit("login_success", username, {"role": user["role"]}, request.remote_addr)

    # Get user account info
    acct = get_user_account_info(username)
    full_name = acct["full_name"] if acct else username

    return jsonify({
        "token": token,
        "username": username,
        "role": user["role"],
        "full_name": full_name,
        "expires_in": JWT_EXPIRY_HOURS * 3600,
    })

# --- Account Info ---
@app.route("/api/accounts/me", methods=["GET"])
@zero_trust_required
def account_me():
    username = request.user.get("sub", "")
    acct = get_user_account_info(username)
    if not acct:
        return jsonify({"error": "Account not found"}), 404
    acct["role"] = request.user.get("role", "")
    return jsonify(acct)

# --- Beneficiaries ---
@app.route("/api/accounts/beneficiaries", methods=["GET"])
@zero_trust_required
def account_beneficiaries():
    current_user = request.user.get("sub", "")
    beneficiaries = []
    for b in BENEFICIARIES:
        # Find matching user account if any
        matched_username = None
        for uname, uinfo in USER_ACCOUNTS.items():
            if uinfo["full_name"] == b["name"] and uname != current_user:
                matched_username = uname
                break
        beneficiaries.append({
            "name": b["name"],
            "type": b["type"],
            "risk": b["risk"],
            "username": matched_username,
        })
    # Filter out sender from beneficiaries
    sender_name = USER_ACCOUNTS.get(current_user, {}).get("full_name", "")
    beneficiaries = [b for b in beneficiaries if b["name"] != sender_name]
    return jsonify({"beneficiaries": beneficiaries})

# --- Dashboard ---
@app.route("/api/dashboard", methods=["GET"])
@zero_trust_required
def dashboard():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("SELECT COUNT(*) FROM settlements")
    total = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM settlements WHERE status='blocked'")
    blocked = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM settlements WHERE status='settled'")
    settled = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM settlements WHERE status='flagged'")
    flagged = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM hitl_queue WHERE status='pending'")
    hitl_pending = c.fetchone()[0]
    c.execute("SELECT AVG(settlement_time_ms) FROM settlements WHERE settlement_time_ms > 0")
    avg_time = c.fetchone()[0] or 0

    conn.close()

    # Get model metrics
    try:
        with open(os.path.join(MODELS_DIR, "metrics.json")) as f:
            model_metrics = json.load(f)
        avg_accuracy = np.mean([m.get("accuracy", 0) for m in model_metrics.values()])
    except Exception:
        avg_accuracy = 0

    nostro_eth = blockchain.get_nostro_balance()
    nostro_usd = nostro_eth * ETH_USD_RATE

    return jsonify({
        "total_settlements": total,
        "settled": settled,
        "blocked": blocked,
        "flagged": flagged,
        "hitl_pending": hitl_pending,
        "avg_settlement_time_ms": round(avg_time, 1),
        "nostro_liquidity_eth": round(nostro_eth, 4),
        "nostro_liquidity_usd": round(nostro_usd, 2),
        "model_accuracy": round(avg_accuracy * 100, 1),
        "accounts": blockchain.accounts[:5] if blockchain.accounts else [],
        "contracts_deployed": list(blockchain.deployed.keys()),
        "ganache_connected": blockchain.w3.is_connected() if blockchain.w3 else False,
    })

# --- Settlement ---
@app.route("/api/settlement", methods=["POST"])
@zero_trust_required
def create_settlement():
    data = request.get_json(force=True)
    start_time = time.time()

    sender_username = request.user.get("sub", "")
    beneficiary_name = data.get("beneficiary_name", "")
    amount = float(data.get("amount", 0))
    currency = data.get("currency", "USD")

    # Check sender balance
    sender_balance = get_user_balance(sender_username)
    if amount > sender_balance:
        return jsonify({
            "error": "Insufficient funds",
            "current_balance": sender_balance,
            "requested_amount": amount,
        }), 400

    # Determine receiver wallet
    receiver_username = data.get("receiver_username", "")
    if receiver_username and receiver_username in USER_ACCOUNTS:
        wallet_idx = USER_ACCOUNTS[receiver_username]["wallet_idx"]
        receiver = blockchain.accounts[wallet_idx] if wallet_idx < len(blockchain.accounts) else ""
    else:
        receiver = data.get("receiver", "")
        if not receiver and blockchain.accounts:
            receiver = blockchain.accounts[1]

    # Generate risk parameters
    hour = datetime.utcnow().hour
    day = datetime.utcnow().weekday()
    is_round = 1 if amount == int(amount) and amount > 0 else 0
    country_risk = float(data.get("country_risk", np.random.uniform(0, 1)))
    sender_id = int(data.get("sender_id", np.random.randint(0, 500)))
    receiver_id = int(data.get("receiver_id", np.random.randint(0, 500)))
    freq = int(data.get("freq_7d", np.random.randint(1, 20)))

    # AML Risk Scoring
    risk_result = aml_engine.score_transaction(
        amount, hour, day, freq, is_round, country_risk,
        sender_id, receiver_id, beneficiary_name
    )

    settlement_id = str(uuid.uuid4())
    iso20022_hash = hashlib.sha256(
        f"{settlement_id}:{amount}:{receiver}:{time.time()}".encode()
    ).digest()

    sender_name = USER_ACCOUNTS.get(sender_username, {}).get("full_name", sender_username)

    shap_data = risk_result.get("shap_values")
    print(f"[SHAP DEBUG] shap_values in risk_result: {shap_data is not None}, models_loaded: {aml_engine.models_loaded}, _last_shap: {getattr(aml_engine, '_last_shap', 'NOT SET')}")
    logger.info(f"SHAP values for settlement: {shap_data}")

    result = {
        "settlement_id": settlement_id,
        "risk_score": risk_result["composite_score"],
        "risk_decision": risk_result["decision"],
        "risk_reasons": risk_result["reasons"],
        "risk_breakdown": risk_result["scores"],
        "shap_values": shap_data,
    }

    if risk_result["decision"] == "blocked":
        # Add to HITL queue
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        hitl_id = str(uuid.uuid4())
        c.execute("""INSERT INTO hitl_queue
            (id, settlement_id, reason, risk_score, amount, sender, receiver, beneficiary_name, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')""",
            (hitl_id, settlement_id, "; ".join(risk_result["reasons"]),
             risk_result["composite_score"], amount,
             sender_name, receiver, beneficiary_name))

        c.execute("""INSERT INTO settlements
            (id, sender, receiver, amount, currency, risk_score, status, beneficiary_name, sender_username, receiver_username)
            VALUES (?, ?, ?, ?, ?, ?, 'blocked', ?, ?, ?)""",
            (settlement_id, sender_name, receiver, amount, currency,
             risk_result["composite_score"], beneficiary_name,
             sender_username, receiver_username))

        conn.commit()
        conn.close()

        # Auto-create compliance case
        case_id, case_number = create_compliance_case_for_blocked(
            settlement_id, risk_result, amount, sender_name, beneficiary_name
        )

        result["status"] = "blocked"
        result["hitl_id"] = hitl_id
        result["case_number"] = case_number
        result["message"] = f"Transaction blocked. Compliance case {case_number} created. Added to HITL review queue."

        push_sse("settlement", {
            "id": settlement_id, "status": "blocked",
            "amount": amount, "risk_score": risk_result["composite_score"]
        })

    else:
        # Deduct sender balance
        new_sender_balance = sender_balance - amount
        update_user_balance(sender_username, new_sender_balance)

        # Credit receiver if they are a user
        if receiver_username and receiver_username in USER_ACCOUNTS:
            receiver_balance = get_user_balance(receiver_username)
            update_user_balance(receiver_username, receiver_balance + amount)

        # Execute on blockchain: convert USD to ETH at fixed rate
        amount_eth = amount / ETH_USD_RATE
        bc_result = blockchain.execute_settlement(
            receiver, amount_eth, iso20022_hash, risk_result["composite_score"]
        )

        elapsed_ms = int((time.time() - start_time) * 1000)

        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        status = "settled" if risk_result["decision"] == "approved" else "flagged"
        tx_hash = bc_result["tx_hash"] if bc_result else "N/A"

        c.execute("""INSERT INTO settlements
            (id, sender, receiver, amount, currency, risk_score, status, tx_hash,
             iso20022_hash, beneficiary_name, settlement_time_ms, sender_username, receiver_username)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (settlement_id, sender_name, receiver, amount, currency,
             risk_result["composite_score"], status, tx_hash, iso20022_hash.hex(),
             beneficiary_name, elapsed_ms, sender_username, receiver_username))

        # SWIFT GPI tracker
        uetr = str(uuid.uuid4())
        c.execute("""INSERT INTO swift_gpi_tracker
            (uetr, settlement_id, status, originator, beneficiary, amount, currency)
            VALUES (?, ?, 'ACCC', ?, ?, ?, ?)""",
            (uetr, settlement_id, sender_name, beneficiary_name, amount, currency))

        conn.commit()
        conn.close()

        result["status"] = status
        result["tx_hash"] = tx_hash
        result["blockchain"] = bc_result
        result["settlement_time_ms"] = elapsed_ms
        result["uetr"] = uetr
        result["new_balance"] = new_sender_balance

        push_sse("settlement", {
            "id": settlement_id, "status": status,
            "amount": amount, "risk_score": risk_result["composite_score"],
            "tx_hash": tx_hash
        })

    log_audit("settlement", request.user.get("sub", "unknown"), result, request.remote_addr)
    return jsonify(result)

# --- Transactions ---
@app.route("/api/transactions", methods=["GET"])
@zero_trust_required
def get_transactions():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    offset = (page - 1) * per_page

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM settlements")
    total = c.fetchone()[0]
    c.execute(
        "SELECT * FROM settlements ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (per_page, offset)
    )
    rows = c.fetchall()
    conn.close()

    transactions = []
    for row in rows:
        transactions.append({
            "id": row[0], "sender": row[1], "receiver": row[2],
            "amount": row[3], "currency": row[4], "risk_score": row[5],
            "status": row[6], "tx_hash": row[7], "iso20022_hash": row[8],
            "beneficiary_name": row[9], "created_at": row[10],
            "settlement_time_ms": row[11]
        })

    return jsonify({
        "transactions": transactions,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    })

# --- HITL Queue ---
@app.route("/api/hitl/queue", methods=["GET"])
@zero_trust_required
def hitl_queue():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM hitl_queue ORDER BY created_at DESC")
    rows = c.fetchall()

    items = []
    for row in rows:
        item = {
            "id": row[0], "settlement_id": row[1], "reason": row[2],
            "risk_score": row[3], "amount": row[4], "sender": row[5],
            "receiver": row[6], "beneficiary_name": row[7], "status": row[8],
            "reviewed_by": row[9], "reviewed_at": row[10], "created_at": row[11]
        }
        # Attach four-eyes info if applicable
        if item["amount"] and item["amount"] >= 100000:
            c.execute("SELECT first_approver, second_approver, status FROM four_eyes_approvals WHERE hitl_id = ?", (row[0],))
            fe = c.fetchone()
            if fe:
                item["first_approver"] = fe[0]
                item["second_approver"] = fe[1]
                item["four_eyes_status"] = fe[2]
        items.append(item)
    conn.close()
    return jsonify({"queue": items, "pending": sum(1 for i in items if i["status"] in ("pending", "awaiting_second_approval"))})

# --- HITL Approve ---
@app.route("/api/hitl/approve/<hitl_id>", methods=["POST"])
@zero_trust_required
def hitl_approve(hitl_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM hitl_queue WHERE id = ?", (hitl_id,))
    item = c.fetchone()
    if not item:
        conn.close()
        return jsonify({"error": "HITL item not found"}), 404

    # Prevent double-approval
    if item[8] not in ('pending', 'awaiting_second_approval'):
        conn.close()
        return jsonify({"error": f"HITL item already {item[8]}"}), 400

    # Get settlement details for balance transfer
    settlement_id = item[1]
    amount = item[4]  # amount from hitl_queue
    c.execute("SELECT sender_username, receiver_username, receiver, amount FROM settlements WHERE id = ?",
              (settlement_id,))
    settlement = c.fetchone()
    if not settlement:
        conn.close()
        return jsonify({"error": "Settlement record not found"}), 404

    sender_username = settlement[0]
    receiver_username = settlement[1]
    receiver_address = settlement[2]
    settle_amount = float(settlement[3] or amount)
    approver = request.user.get("sub", "")

    logger.info(f"HITL APPROVE: sender={sender_username}, receiver={receiver_username}, amount={settle_amount} (type={type(settle_amount).__name__}), approver={approver}, hitl_status={item[8]}")

    # === FOUR-EYES APPROVAL for amounts >= $100,000 ===
    FOUR_EYES_THRESHOLD = 100000
    logger.info(f"FOUR-EYES CHECK: amount={settle_amount}, threshold={FOUR_EYES_THRESHOLD}, requires_four_eyes={settle_amount >= FOUR_EYES_THRESHOLD}")
    if settle_amount >= FOUR_EYES_THRESHOLD:
        c.execute("SELECT * FROM four_eyes_approvals WHERE hitl_id = ?", (hitl_id,))
        fe_record = c.fetchone()
        logger.info(f"FOUR-EYES: existing record={fe_record}")

        if not fe_record:
            # First approval — record and wait for second
            fe_id = str(uuid.uuid4())
            c.execute("""INSERT INTO four_eyes_approvals
                (id, hitl_id, first_approver, first_approved_at, required, status)
                VALUES (?, ?, ?, ?, 2, 'awaiting_second')""",
                (fe_id, hitl_id, approver, datetime.utcnow().isoformat()))
            c.execute("UPDATE hitl_queue SET status='awaiting_second_approval' WHERE id=?", (hitl_id,))
            conn.commit()
            conn.close()
            log_audit("four_eyes_first_approval", approver, {
                "hitl_id": hitl_id, "amount": settle_amount}, request.remote_addr)
            push_sse("hitl", {"id": hitl_id, "action": "first_approval", "approver": approver, "amount": settle_amount})
            return jsonify({
                "status": "awaiting_second_approval",
                "message": f"Four-eyes required for amounts >${FOUR_EYES_THRESHOLD:,}. First approval recorded by {approver}. A different approver must confirm.",
                "hitl_id": hitl_id, "first_approver": approver,
            })

        # fe_record exists — check if this is the second approver
        first_approver = fe_record[2]  # first_approver column
        fe_status = fe_record[7]       # status column (index 7, not 6)
        logger.info(f"FOUR-EYES SECOND: first_approver={first_approver}, fe_status={fe_status}, current_approver={approver}, same_user={approver == first_approver}")

        if fe_status == 'completed':
            conn.close()
            return jsonify({"error": "Four-eyes approval already completed"}), 400

        if approver == first_approver:
            conn.close()
            return jsonify({
                "error": "Four-eyes violation: second approver must be different from first approver",
                "first_approver": first_approver,
            }), 403

        # Second approval — proceed with execution
        c.execute("""UPDATE four_eyes_approvals SET second_approver=?, second_approved_at=?, status='completed'
            WHERE hitl_id=?""", (approver, datetime.utcnow().isoformat(), hitl_id))
        logger.info(f"FOUR-EYES COMPLETE: first={first_approver}, second={approver}, amount={settle_amount}")

    # === Balance check and transfer ===
    c.execute("SELECT balance FROM user_accounts WHERE username = ?", (sender_username,))
    bal_row = c.fetchone()
    sender_balance = bal_row[0] if bal_row else 0.0
    logger.info(f"HITL APPROVE: sender_balance={sender_balance}, sender={sender_username}")

    if settle_amount > sender_balance:
        conn.close()
        return jsonify({
            "error": "Insufficient funds - sender balance changed since transaction was blocked",
            "current_balance": sender_balance,
            "required_amount": settle_amount,
        }), 400

    # Deduct sender balance
    new_sender_balance = sender_balance - settle_amount
    c.execute("UPDATE user_accounts SET balance = ?, updated_at = ? WHERE username = ?",
              (new_sender_balance, datetime.utcnow().isoformat(), sender_username))
    logger.info(f"HITL APPROVE: deducted {settle_amount} from {sender_username}: {sender_balance} -> {new_sender_balance}")

    # Credit receiver if they are a system user
    if receiver_username and receiver_username in USER_ACCOUNTS:
        c.execute("SELECT balance FROM user_accounts WHERE username = ?", (receiver_username,))
        recv_row = c.fetchone()
        if recv_row:
            new_recv_balance = recv_row[0] + settle_amount
            c.execute("UPDATE user_accounts SET balance = ?, updated_at = ? WHERE username = ?",
                      (new_recv_balance, datetime.utcnow().isoformat(), receiver_username))
            logger.info(f"HITL APPROVE: credited {settle_amount} to {receiver_username}: {recv_row[0]} -> {new_recv_balance}")

    # Execute blockchain settlement
    bc_result = None
    tx_hash = "N/A"
    try:
        amount_eth = settle_amount / ETH_USD_RATE
        iso20022_hash = hashlib.sha256(
            f"{settlement_id}:{settle_amount}:{receiver_address}:{time.time()}".encode()
        ).digest()
        bc_result = blockchain.execute_settlement(
            receiver_address, amount_eth, iso20022_hash, item[3]
        )
        if bc_result:
            tx_hash = bc_result["tx_hash"]
    except Exception as e:
        logger.error(f"HITL approve blockchain error: {e}")

    # Update records
    c.execute("""UPDATE hitl_queue SET status='approved', reviewed_by=?, reviewed_at=?
        WHERE id=?""", (approver, datetime.utcnow().isoformat(), hitl_id))
    c.execute("UPDATE settlements SET status='settled', tx_hash=? WHERE id=?",
              (tx_hash, settlement_id))
    conn.commit()
    conn.close()

    log_audit("hitl_approve", approver, {
        "hitl_id": hitl_id, "settlement_id": settlement_id,
        "amount": settle_amount, "sender": sender_username,
        "sender_new_balance": new_sender_balance, "tx_hash": tx_hash,
        "four_eyes": settle_amount > FOUR_EYES_THRESHOLD,
    }, request.remote_addr)
    push_sse("hitl", {"id": hitl_id, "action": "approved", "amount": settle_amount, "tx_hash": tx_hash})
    return jsonify({
        "status": "approved", "hitl_id": hitl_id,
        "settlement_id": settlement_id, "tx_hash": tx_hash,
        "amount": settle_amount, "sender_new_balance": new_sender_balance,
        "four_eyes_applied": settle_amount > FOUR_EYES_THRESHOLD,
    })

# --- HITL Reject ---
@app.route("/api/hitl/reject/<hitl_id>", methods=["POST"])
@zero_trust_required
def hitl_reject(hitl_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM hitl_queue WHERE id = ?", (hitl_id,))
    item = c.fetchone()
    if not item:
        conn.close()
        return jsonify({"error": "HITL item not found"}), 404

    c.execute("""UPDATE hitl_queue SET status='rejected', reviewed_by=?, reviewed_at=?
        WHERE id=?""", (request.user.get("sub"), datetime.utcnow().isoformat(), hitl_id))
    c.execute("UPDATE settlements SET status='rejected' WHERE id=?", (item[1],))
    conn.commit()
    conn.close()

    log_audit("hitl_reject", request.user.get("sub"), {"hitl_id": hitl_id}, request.remote_addr)
    push_sse("hitl", {"id": hitl_id, "action": "rejected"})
    return jsonify({"status": "rejected", "hitl_id": hitl_id})

# --- Sanctions ---
@app.route("/api/compliance/sanctions", methods=["GET"])
@zero_trust_required
def get_sanctions():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM sanctions_list ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    items = [{"id": r[0], "entity_name": r[1], "entity_type": r[2],
              "added_by": r[3], "reason": r[4], "created_at": r[5]} for r in rows]
    return jsonify({"sanctions": items, "total": len(items)})

@app.route("/api/compliance/sanctions", methods=["POST"])
@zero_trust_required
def add_sanction():
    data = request.get_json(force=True)
    entity_name = data.get("entity_name", "")
    entity_type = data.get("entity_type", "individual")
    reason = data.get("reason", "Manual addition")

    if not entity_name:
        return jsonify({"error": "entity_name required"}), 400

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute("""INSERT INTO sanctions_list (entity_name, entity_type, added_by, reason)
            VALUES (?, ?, ?, ?)""",
            (entity_name, entity_type, request.user.get("sub"), reason))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "Entity already in sanctions list"}), 409
    conn.close()

    log_audit("sanction_added", request.user.get("sub"),
              {"entity": entity_name}, request.remote_addr)
    return jsonify({"status": "added", "entity_name": entity_name})

# --- SWIFT GPI ---
@app.route("/api/compliance/swift-gpi/<uetr>", methods=["GET"])
@zero_trust_required
def swift_gpi_track(uetr):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM swift_gpi_tracker WHERE uetr = ?", (uetr,))
    row = c.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "UETR not found"}), 404

    return jsonify({
        "uetr": row[0], "settlement_id": row[1], "status": row[2],
        "originator": row[3], "beneficiary": row[4], "amount": row[5],
        "currency": row[6], "created_at": row[7], "updated_at": row[8]
    })

# ============================================================
# Compliance Case Management Endpoints
# ============================================================
@app.route("/api/compliance/cases", methods=["GET"])
@zero_trust_required
def list_compliance_cases():
    status_filter = request.args.get("status", "")
    severity_filter = request.args.get("severity", "")
    case_type_filter = request.args.get("case_type", "")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    query = "SELECT * FROM compliance_cases WHERE 1=1"
    params = []
    if status_filter:
        query += " AND status = ?"
        params.append(status_filter)
    if severity_filter:
        query += " AND severity = ?"
        params.append(severity_filter)
    if case_type_filter:
        query += " AND case_type = ?"
        params.append(case_type_filter)
    query += " ORDER BY created_at DESC"

    c.execute(query, params)
    rows = c.fetchall()
    conn.close()

    cases = []
    for r in rows:
        cases.append({
            "id": r["id"],
            "case_number": r["case_number"],
            "settlement_id": r["settlement_id"],
            "case_type": r["case_type"],
            "severity": r["severity"],
            "status": r["status"],
            "assigned_to": r["assigned_to"],
            "description": r["description"],
            "risk_score": r["risk_score"],
            "amount": r["amount"],
            "sender_name": r["sender_name"],
            "beneficiary_name": r["beneficiary_name"],
            "findings": r["findings"],
            "resolution": r["resolution"],
            "regulatory_report_filed": r["regulatory_report_filed"],
            "sar_number": r["sar_number"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
            "closed_at": r["closed_at"],
        })

    # Summary counts
    conn2 = sqlite3.connect(DB_PATH)
    c2 = conn2.cursor()
    c2.execute("SELECT COUNT(*) FROM compliance_cases WHERE status='open'")
    open_count = c2.fetchone()[0]
    c2.execute("SELECT COUNT(*) FROM compliance_cases WHERE status='investigating'")
    investigating_count = c2.fetchone()[0]
    c2.execute("SELECT COUNT(*) FROM compliance_cases WHERE status='escalated'")
    escalated_count = c2.fetchone()[0]
    c2.execute("SELECT COUNT(*) FROM compliance_cases WHERE status='resolved'")
    resolved_count = c2.fetchone()[0]
    conn2.close()

    return jsonify({
        "cases": cases,
        "total": len(cases),
        "summary": {
            "open": open_count,
            "investigating": investigating_count,
            "escalated": escalated_count,
            "resolved": resolved_count,
        }
    })

@app.route("/api/compliance/cases/<case_id>", methods=["GET"])
@zero_trust_required
def get_compliance_case(case_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM compliance_cases WHERE id = ? OR case_number = ?", (case_id, case_id))
    r = c.fetchone()
    conn.close()
    if not r:
        return jsonify({"error": "Case not found"}), 404
    return jsonify({
        "id": r["id"],
        "case_number": r["case_number"],
        "settlement_id": r["settlement_id"],
        "case_type": r["case_type"],
        "severity": r["severity"],
        "status": r["status"],
        "assigned_to": r["assigned_to"],
        "description": r["description"],
        "risk_score": r["risk_score"],
        "amount": r["amount"],
        "sender_name": r["sender_name"],
        "beneficiary_name": r["beneficiary_name"],
        "findings": r["findings"],
        "resolution": r["resolution"],
        "regulatory_report_filed": r["regulatory_report_filed"],
        "sar_number": r["sar_number"],
        "created_at": r["created_at"],
        "updated_at": r["updated_at"],
        "closed_at": r["closed_at"],
    })

@app.route("/api/compliance/cases", methods=["POST"])
@zero_trust_required
def create_compliance_case():
    data = request.get_json(force=True)
    case_id = str(uuid.uuid4())
    case_number = generate_case_number()

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""INSERT INTO compliance_cases
        (id, case_number, settlement_id, case_type, severity, status, assigned_to,
         description, risk_score, amount, sender_name, beneficiary_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (case_id, case_number, data.get("settlement_id", ""),
         data.get("case_type", "aml"), data.get("severity", "medium"),
         data.get("status", "open"), data.get("assigned_to", ""),
         data.get("description", ""), data.get("risk_score", 0),
         data.get("amount", 0), data.get("sender_name", ""),
         data.get("beneficiary_name", "")))
    conn.commit()
    conn.close()

    log_audit("case_created", request.user.get("sub"),
              {"case_number": case_number}, request.remote_addr)
    return jsonify({"status": "created", "case_id": case_id, "case_number": case_number})

@app.route("/api/compliance/cases/<case_id>", methods=["PUT"])
@zero_trust_required
def update_compliance_case(case_id):
    data = request.get_json(force=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    updates = []
    params = []
    for field in ["status", "assigned_to", "findings", "resolution", "severity"]:
        if field in data:
            updates.append(f"{field} = ?")
            params.append(data[field])

    if data.get("status") in ("resolved", "closed"):
        updates.append("closed_at = ?")
        params.append(datetime.utcnow().isoformat())

    updates.append("updated_at = ?")
    params.append(datetime.utcnow().isoformat())
    params.append(case_id)

    c.execute(f"UPDATE compliance_cases SET {', '.join(updates)} WHERE id = ? OR case_number = ?",
              params + [case_id])
    conn.commit()
    conn.close()

    log_audit("case_updated", request.user.get("sub"),
              {"case_id": case_id, "updates": data}, request.remote_addr)
    return jsonify({"status": "updated", "case_id": case_id})

@app.route("/api/compliance/cases/<case_id>/escalate", methods=["POST"])
@zero_trust_required
def escalate_compliance_case(case_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""UPDATE compliance_cases SET status='escalated', updated_at=?
        WHERE id = ? OR case_number = ?""",
        (datetime.utcnow().isoformat(), case_id, case_id))
    conn.commit()
    conn.close()
    log_audit("case_escalated", request.user.get("sub"),
              {"case_id": case_id}, request.remote_addr)
    return jsonify({"status": "escalated", "case_id": case_id})

@app.route("/api/compliance/cases/<case_id>/file-sar", methods=["POST"])
@zero_trust_required
def file_sar(case_id):
    sar_number = f"SAR-2026-{uuid.uuid4().hex[:8].upper()}"
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""UPDATE compliance_cases SET regulatory_report_filed=1, sar_number=?, updated_at=?
        WHERE id = ? OR case_number = ?""",
        (sar_number, datetime.utcnow().isoformat(), case_id, case_id))
    conn.commit()
    conn.close()
    log_audit("sar_filed", request.user.get("sub"),
              {"case_id": case_id, "sar_number": sar_number}, request.remote_addr)
    return jsonify({"status": "filed", "sar_number": sar_number, "case_id": case_id})

# --- Network Graph ---
@app.route("/api/network/graph", methods=["GET"])
@zero_trust_required
def network_graph():
    try:
        with open(os.path.join(MODELS_DIR, "graph_data.json")) as f:
            data = json.load(f)
        # Limit to top 200 nodes by pagerank for visualization
        nodes_sorted = sorted(data["nodes"], key=lambda n: n["pagerank"], reverse=True)[:200]
        node_ids = set(n["id"] for n in nodes_sorted)
        edges_filtered = [e for e in data["edges"] if e["source"] in node_ids and e["target"] in node_ids]
        return jsonify({
            "nodes": nodes_sorted,
            "edges": edges_filtered[:500],
            "cycles": data.get("cycles", []),
            "communities": data.get("communities", 0),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Model Metrics ---
@app.route("/api/models/metrics", methods=["GET"])
@zero_trust_required
def model_metrics():
    try:
        with open(os.path.join(MODELS_DIR, "metrics.json")) as f:
            metrics = json.load(f)
        with open(os.path.join(MODELS_DIR, "feature_importance.json")) as f:
            feat_imp = json.load(f)
        return jsonify({
            "models": metrics,
            "feature_importance": feat_imp,
            "ensemble_weights": {"rules": 0.30, "ml": 0.40, "nlp": 0.15, "graph": 0.15},
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Retrain (admin and datascientist only) ---
@app.route("/api/models/retrain", methods=["POST"])
@zero_trust_required
def retrain_models():
    if request.user.get("role") not in ("admin", "datascientist"):
        return jsonify({"error": "Insufficient permissions. Only admin and datascientist can retrain."}), 403

    def _retrain():
        try:
            logger.info("Model retraining initiated")
            from sklearn.ensemble import IsolationForest, RandomForestClassifier
            from sklearn.neural_network import MLPRegressor
            import xgboost as xgb_mod

            np.random.seed(int(time.time()) % 10000)
            N = 15000
            N_F = 750   # 5% fraud
            N_N = N - N_F
            N_FP = 500  # false positive bait
            N_CN = N_N - N_FP

            # Clean normal
            normal = {
                'amount': np.random.lognormal(mean=9.5, sigma=1.2, size=N_CN).clip(100, 500000),
                'hour': np.random.randint(0, 24, N_CN),
                'day_of_week': np.random.randint(0, 7, N_CN),
                'freq_7d': np.random.randint(1, 25, N_CN),
                'is_round': np.random.choice([0, 1], N_CN, p=[0.82, 0.18]),
                'country_risk': np.random.beta(2, 5, N_CN),
                'sender_id': np.random.randint(0, 500, N_CN),
                'receiver_id': np.random.randint(0, 500, N_CN),
                'is_fraud': np.zeros(N_CN, dtype=int),
            }
            # FP bait — looks suspicious but is legit
            fp_bait = {
                'amount': np.concatenate([
                    np.random.uniform(9000, 9999, N_FP // 4),
                    np.random.uniform(100000, 600000, N_FP // 4),
                    np.random.uniform(50000, 200000, N_FP // 4),
                    np.random.uniform(5000, 50000, N_FP - 3 * (N_FP // 4)),
                ]),
                'hour': np.random.choice([0, 1, 2, 3, 22, 23], N_FP),
                'day_of_week': np.random.randint(0, 7, N_FP),
                'freq_7d': np.random.randint(10, 35, N_FP),
                'is_round': np.random.choice([0, 1], N_FP, p=[0.5, 0.5]),
                'country_risk': np.random.uniform(0.4, 0.9, N_FP),
                'sender_id': np.random.randint(0, 200, N_FP),
                'receiver_id': np.random.randint(0, 200, N_FP),
                'is_fraud': np.zeros(N_FP, dtype=int),
            }
            # Fraud — 70% clear, 30% subtle
            N_CF = int(N_F * 0.7)
            N_SF = N_F - N_CF
            fraud = {
                'amount': np.concatenate([
                    np.random.uniform(9000, 9999, N_CF // 3),
                    np.random.uniform(300000, 2000000, N_CF // 3),
                    np.random.uniform(15000, 150000, N_CF - 2 * (N_CF // 3)),
                    np.random.lognormal(mean=10.0, sigma=1.0, size=N_SF).clip(5000, 300000),
                ]),
                'hour': np.concatenate([np.random.choice([0,1,2,3,22,23], N_CF), np.random.randint(0,24,N_SF)]),
                'day_of_week': np.random.randint(0, 7, N_F),
                'freq_7d': np.concatenate([np.random.randint(12, 45, N_CF), np.random.randint(5, 25, N_SF)]),
                'is_round': np.concatenate([
                    np.random.choice([0,1], N_CF, p=[0.35,0.65]),
                    np.random.choice([0,1], N_SF, p=[0.75,0.25]),
                ]),
                'country_risk': np.concatenate([
                    np.random.uniform(0.5, 1.0, N_CF),
                    np.random.uniform(0.2, 0.8, N_SF),
                ]),
                'sender_id': np.concatenate([np.random.randint(0, 100, N_CF), np.random.randint(0, 400, N_SF)]),
                'receiver_id': np.concatenate([np.random.randint(0, 100, N_CF), np.random.randint(0, 400, N_SF)]),
                'is_fraud': np.ones(N_F, dtype=int),
            }

            import pandas as pd
            df_rt = pd.concat([pd.DataFrame(normal), pd.DataFrame(fp_bait), pd.DataFrame(fraud)], ignore_index=True)
            df_rt = df_rt.sample(frac=1).reset_index(drop=True)
            feats = ['amount','hour','day_of_week','freq_7d','is_round','country_risk','sender_id','receiver_id']
            X_rt = df_rt[feats].values
            y_rt = df_rt['is_fraud'].values
            from sklearn.model_selection import train_test_split as tts
            X_tr, X_te, y_tr, y_te = tts(X_rt, y_rt, test_size=0.2, stratify=y_rt)

            iso = IsolationForest(n_estimators=100, contamination=0.05, n_jobs=-1)
            iso.fit(X_tr)
            joblib.dump(iso, os.path.join(MODELS_DIR, "isolation_forest.pkl"))

            rf = RandomForestClassifier(
                n_estimators=150, max_depth=12, min_samples_leaf=10,
                max_features='sqrt', class_weight='balanced', n_jobs=-1
            )
            rf.fit(X_tr, y_tr)
            joblib.dump(rf, os.path.join(MODELS_DIR, "random_forest.pkl"))

            spw = (y_tr == 0).sum() / max((y_tr == 1).sum(), 1)
            xg = xgb_mod.XGBClassifier(
                n_estimators=200, max_depth=6, learning_rate=0.05,
                scale_pos_weight=spw, reg_alpha=1.0, reg_lambda=2.0,
                subsample=0.8, colsample_bytree=0.8,
                use_label_encoder=False, eval_metric='logloss', n_jobs=-1
            )
            xg.fit(X_tr, y_tr)
            joblib.dump(xg, os.path.join(MODELS_DIR, "xgboost.pkl"))

            X_norm = X_tr[y_tr == 0]
            ae = MLPRegressor(hidden_layer_sizes=(64,32,16,32,64), activation='relu', max_iter=200)
            ae.fit(X_norm, X_norm)
            joblib.dump(ae, os.path.join(MODELS_DIR, "autoencoder.pkl"))
            thr = np.percentile(np.mean((X_norm - ae.predict(X_norm))**2, axis=1), 97)
            joblib.dump(thr, os.path.join(MODELS_DIR, "ae_threshold.pkl"))

            from sklearn.metrics import f1_score as f1s, accuracy_score as accs
            new_metrics = {}
            for name, mdl, needs_inv in [("isolation_forest", iso, True), ("random_forest", rf, False),
                                          ("xgboost", xg, False)]:
                if needs_inv:
                    p = (mdl.predict(X_te) == -1).astype(int)
                else:
                    p = mdl.predict(X_te)
                new_metrics[name] = {"f1": float(f1s(y_te, p, zero_division=0)),
                                     "accuracy": float(accs(y_te, p))}
            recon_e = np.mean((X_te - ae.predict(X_te))**2, axis=1)
            ae_p = (recon_e > thr).astype(int)
            new_metrics["autoencoder"] = {"f1": float(f1s(y_te, ae_p, zero_division=0)),
                                          "accuracy": float(accs(y_te, ae_p))}

            with open(os.path.join(MODELS_DIR, "metrics.json"), "w") as f:
                json.dump(new_metrics, f, indent=2)

            fi = dict(zip(feats, rf.feature_importances_.tolist()))
            with open(os.path.join(MODELS_DIR, "feature_importance.json"), "w") as f:
                json.dump(fi, f, indent=2)

            aml_engine._load_models()
            logger.info("Model retraining complete")
            push_sse("retrain", {"status": "complete", "metrics": new_metrics})
        except Exception as e:
            logger.error(f"Retrain error: {e}")
            push_sse("retrain", {"status": "error", "message": str(e)})

    t = threading.Thread(target=_retrain)
    t.start()
    log_audit("retrain", request.user.get("sub"), {"status": "initiated"}, request.remote_addr)
    return jsonify({"status": "retraining initiated", "message": "Models will be updated shortly."})

# --- Audit Log ---
@app.route("/api/audit/log", methods=["GET"])
@zero_trust_required
def audit_log():
    limit = int(request.args.get("limit", 50))
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()

    entries = [{"id": r[0], "event_type": r[1], "actor": r[2],
                "details": r[3], "ip_address": r[4], "created_at": r[5]} for r in rows]
    return jsonify({"entries": entries, "total": len(entries)})

# --- GDPR Right to Erasure ---
@app.route("/api/gdpr/erasure", methods=["POST"])
@zero_trust_required
def gdpr_erasure():
    if request.user.get("role") not in ("admin", "compliance"):
        return jsonify({"error": "Insufficient permissions"}), 403

    data = request.get_json(force=True)
    entity_id = data.get("entity_id", "")

    if not entity_id:
        return jsonify({"error": "entity_id required"}), 400

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Anonymize PII
    c.execute("DELETE FROM pii_vault WHERE id = ?", (entity_id,))
    c.execute("""UPDATE settlements SET beneficiary_name='[REDACTED]', sender='[REDACTED]'
        WHERE beneficiary_name LIKE ? OR sender LIKE ?""",
        (f"%{entity_id}%", f"%{entity_id}%"))

    affected = conn.total_changes
    conn.commit()
    conn.close()

    log_audit("gdpr_erasure", request.user.get("sub"),
              {"entity_id": entity_id, "records_affected": affected}, request.remote_addr)
    return jsonify({"status": "erased", "entity_id": entity_id, "records_affected": affected})

# --- Health Check ---
@app.route("/api/health", methods=["GET"])
def health_check():
    checks = {"api": "healthy", "database": "unknown", "blockchain": "unknown", "models": "unknown"}
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("SELECT 1")
        conn.close()
        checks["database"] = "healthy"
    except Exception:
        checks["database"] = "unhealthy"
    try:
        if blockchain.w3 and blockchain.w3.is_connected():
            checks["blockchain"] = "healthy"
        else:
            checks["blockchain"] = "unhealthy"
    except Exception:
        checks["blockchain"] = "unhealthy"
    checks["models"] = "healthy" if aml_engine.models_loaded else "unhealthy"
    overall = "healthy" if all(v == "healthy" for v in checks.values()) else "degraded"
    return jsonify({"status": overall, "checks": checks, "timestamp": datetime.utcnow().isoformat()})

# --- Prometheus Metrics ---
@app.route("/api/metrics", methods=["GET"])
def prometheus_metrics():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM settlements")
    total = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM settlements WHERE status='settled'")
    settled = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM settlements WHERE status='blocked'")
    blocked = c.fetchone()[0]
    c.execute("SELECT AVG(settlement_time_ms) FROM settlements WHERE settlement_time_ms > 0")
    avg_time = c.fetchone()[0] or 0
    c.execute("SELECT SUM(amount) FROM settlements WHERE status='settled'")
    total_volume = c.fetchone()[0] or 0
    c.execute("SELECT COUNT(*) FROM compliance_cases WHERE status='open'")
    open_cases = c.fetchone()[0]
    conn.close()
    txt = f"""# HELP ipts_settlements_total Total settlements
# TYPE ipts_settlements_total counter
ipts_settlements_total {total}
# HELP ipts_settlements_settled Settled transactions
# TYPE ipts_settlements_settled counter
ipts_settlements_settled {settled}
# HELP ipts_settlements_blocked Blocked transactions
# TYPE ipts_settlements_blocked counter
ipts_settlements_blocked {blocked}
# HELP ipts_settlement_latency_avg_ms Average settlement latency
# TYPE ipts_settlement_latency_avg_ms gauge
ipts_settlement_latency_avg_ms {avg_time:.1f}
# HELP ipts_volume_usd Total settled volume USD
# TYPE ipts_volume_usd counter
ipts_volume_usd {total_volume:.2f}
# HELP ipts_compliance_cases_open Open compliance cases
# TYPE ipts_compliance_cases_open gauge
ipts_compliance_cases_open {open_cases}
# HELP ipts_models_loaded ML models loaded
# TYPE ipts_models_loaded gauge
ipts_models_loaded {1 if aml_engine.models_loaded else 0}
"""
    return Response(txt, mimetype="text/plain")

# --- FX Rates ---
@app.route("/api/fx/rates", methods=["GET"])
@zero_trust_required
def fx_rates():
    base = request.args.get("base", "USD")
    return jsonify({"base": base, "rates": fx_engine.get_all_rates(base), "currencies": FXEngine.SUPPORTED_CURRENCIES})

@app.route("/api/fx/convert", methods=["POST"])
@zero_trust_required
def fx_convert():
    data = request.get_json(force=True)
    amount = float(data.get("amount", 0))
    from_ccy = data.get("from", "USD")
    to_ccy = data.get("to", "EUR")
    converted, rate = fx_engine.convert(amount, from_ccy, to_ccy)
    if converted is None:
        return jsonify({"error": f"Unsupported currency pair {from_ccy}/{to_ccy}"}), 400
    return jsonify({"amount": amount, "from": from_ccy, "to": to_ccy, "converted": converted, "rate": rate})

# --- Compliance SLA Status ---
@app.route("/api/compliance/sla-status", methods=["GET"])
@zero_trust_required
def compliance_sla_status():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, case_number, severity, status, sla_deadline, created_at FROM compliance_cases WHERE status IN ('open','investigating','escalated')")
    rows = c.fetchall()
    conn.close()
    now = datetime.utcnow().isoformat()
    cases = []
    for r in rows:
        deadline = r[4]
        overdue = deadline and deadline < now
        cases.append({
            "id": r[0], "case_number": r[1], "severity": r[2], "status": r[3],
            "sla_deadline": deadline, "overdue": overdue,
        })
    overdue_count = sum(1 for c in cases if c["overdue"])
    return jsonify({"cases": cases, "total": len(cases), "overdue": overdue_count})

# --- SSE Stream ---
@app.route("/api/stream", methods=["GET"])
def sse_stream():
    def generate():
        last_idx = len(sse_events)
        while True:
            if len(sse_events) > last_idx:
                for event in sse_events[last_idx:]:
                    yield f"data: {json.dumps(event)}\n\n"
                last_idx = len(sse_events)
            else:
                # Heartbeat
                yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
            time.sleep(2)

    return Response(generate(), mimetype='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})

# --- SHAP Test ---
@app.route("/api/shap/test")
def shap_test():
    """Quick test to verify SHAP is working"""
    import numpy as np
    features = np.array([[150000, 14, 2, 5, 1, 0.3, 100, 200]])
    result = aml_engine.score_transaction(150000, 14, 2, 5, 1, 0.3, 100, 200, "Test User")
    return jsonify({
        "models_loaded": aml_engine.models_loaded,
        "shap_values": result.get("shap_values"),
        "last_shap_attr": getattr(aml_engine, '_last_shap', 'NOT_SET'),
        "risk_score": result.get("composite_score"),
    })

# --- Serve Frontend ---
@app.route("/")
def index():
    return render_template("index.html")

# ============================================================
# Main
# ============================================================
if __name__ == "__main__":
    print("\n  IPTS Flask API starting on port 5000...")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
'''

with open("/content/ipts/app.py", "w") as f:
    f.write(APP_PY)

print(f"  Written app.py ({len(APP_PY)} bytes)")
print("[PHASE 6] Complete.\n")

# ============================================================
# PHASE 7 - LAUNCH SERVICES
# ============================================================
print("[PHASE 7] Launching Services...")

import subprocess
import urllib.request

# Start Ganache
print("  Starting Ganache on port 8545...", end=" ", flush=True)
ganache_proc = subprocess.Popen(
    ["ganache", "--port", "8545", "--accounts", "10", "--defaultBalanceEther", "1000",
     "--gasLimit", "10000000", "--quiet"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
)
# Wait for Ganache
for i in range(30):
    try:
        urllib.request.urlopen("http://127.0.0.1:8545", timeout=2)
        print(f"ready (attempt {i+1})")
        break
    except Exception:
        time.sleep(1)
else:
    print("WARNING: Ganache may not be ready")

# Start Flask
print("  Starting Flask API on port 5000...", end=" ", flush=True)
flask_proc = subprocess.Popen(
    [sys.executable, "/content/ipts/app.py"],
    stdout=open("/content/ipts/logs/flask_stdout.log", "w"),
    stderr=open("/content/ipts/logs/flask_stderr.log", "w"),
    cwd="/content/ipts"
)
for i in range(20):
    try:
        urllib.request.urlopen("http://127.0.0.1:5000/api/login", timeout=2)
        print(f"ready (attempt {i+1})")
        break
    except Exception:
        time.sleep(1)
else:
    # Check if it started even if login isn't responding yet
    try:
        urllib.request.urlopen("http://127.0.0.1:5000/", timeout=2)
        print("ready")
    except Exception:
        print("WARNING: Flask may not be ready")

# Start localtunnel
print("  Starting localtunnel...", end=" ", flush=True)
tunnel_proc = subprocess.Popen(
    ["npx", "localtunnel", "--port", "5000"],
    stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
)
tunnel_url = "N/A"
try:
    for i in range(15):
        line = tunnel_proc.stdout.readline()
        if line and "url" in line.lower():
            tunnel_url = line.strip().split("url is: ")[-1] if "url is:" in line else line.strip()
            break
        if line and line.startswith("http"):
            tunnel_url = line.strip()
            break
        time.sleep(1)
    if tunnel_url == "N/A":
        # Try reading what we have
        time.sleep(3)
        import select
        if tunnel_proc.stdout.readable():
            remaining = tunnel_proc.stdout.readline()
            if remaining and "http" in remaining:
                tunnel_url = remaining.strip().split()[-1]
except Exception as e:
    print(f"tunnel error: {e}")
print(f"URL: {tunnel_url}")

# Get external IP
external_ip = "N/A"
try:
    external_ip = urllib.request.urlopen("https://api.ipify.org", timeout=5).read().decode()
except Exception:
    pass

print(f"[PHASE 7] Complete.\n")

# ============================================================
# PHASE 8 - STATUS BANNER
# ============================================================
print("=" * 70)
print("  IPTS - INTEGRATED PAYMENT TRANSFORMATION SYSTEM")
print("  Enterprise Deployment Complete")
print("=" * 70)
print(f"""
  LOCAL URL:     http://127.0.0.1:5000
  TUNNEL URL:    {tunnel_url}
  EXTERNAL IP:   {external_ip}

  GANACHE RPC:   http://127.0.0.1:8545
  FLASK API:     http://127.0.0.1:5000/api/

  LOGIN CREDENTIALS:
  +----------------+--------------------+-----------------+---------------+
  | Username       | Password           | Role            | Balance (USD) |
  +----------------+--------------------+-----------------+---------------+
  | mohamad        | Mohamad@2026!      | admin           | $1,000,000    |
  | rohit          | Rohit@2026!        | operator        | $750,000      |
  | sriram         | Sriram@2026!       | auditor         | $500,000      |
  | walid          | Walid@2026!        | compliance      | $350,000      |
  | vibin          | Vibin@2026!        | datascientist   | $150,000      |
  +----------------+--------------------+-----------------+---------------+

  AML RULES:
  - Transactions > $100,000 USD -> AUTO-BLOCKED (AML threshold)
  - Transactions > $500,000 USD -> AUTO-BLOCKED (critical alert)
  - Watchlist/Sanctions match   -> AUTO-BLOCKED (score 95+)
  - Structuring ($9K-$9.9K)    -> FLAGGED or BLOCKED if high-frequency

  SYSTEM STATUS:
  - Ganache:     PID {ganache_proc.pid}
  - Flask:       PID {flask_proc.pid}
  - Tunnel:      PID {tunnel_proc.pid}
  - ML Models:   4 trained & saved
  - Contracts:   {len(compiled_contracts)} compiled & deployed
  - Database:    /content/ipts/ipts_vault.db

  API ENDPOINTS:
  POST /api/login                           - JWT authentication
  GET  /api/accounts/me                     - Current user account info
  GET  /api/accounts/beneficiaries          - List beneficiaries
  GET  /api/dashboard                       - Real-time metrics (USD)
  POST /api/settlement                      - Execute settlement
  GET  /api/transactions                    - Transaction history
  GET  /api/hitl/queue                      - HITL review queue
  POST /api/hitl/approve/id                 - Approve blocked tx
  POST /api/hitl/reject/id                  - Reject blocked tx
  GET  /api/compliance/sanctions            - Sanctions list
  POST /api/compliance/sanctions            - Add sanction
  GET  /api/compliance/swift-gpi/uetr       - SWIFT tracking
  GET  /api/compliance/cases                - List compliance cases
  GET  /api/compliance/cases/<id>           - Get case details
  POST /api/compliance/cases                - Create case
  PUT  /api/compliance/cases/<id>           - Update case
  POST /api/compliance/cases/<id>/escalate  - Escalate case
  POST /api/compliance/cases/<id>/file-sar  - File SAR
  GET  /api/network/graph                   - Graph visualization data
  GET  /api/models/metrics                  - ML model metrics
  POST /api/models/retrain                  - Retrain models (admin/datascientist)
  GET  /api/audit/log                       - Audit trail
  POST /api/gdpr/erasure                    - GDPR right to erasure
  GET  /api/stream                          - SSE real-time stream
""")
print("=" * 70)
print("  System is LIVE. Open the tunnel URL in your browser.")
print("=" * 70)
