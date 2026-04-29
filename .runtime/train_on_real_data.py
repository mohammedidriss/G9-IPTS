"""
train_on_real_data.py
=====================
Trains all IPTS ML models on the ULB Credit Card Fraud Detection dataset
(284,807 real transactions, 492 confirmed fraud cases).

Dataset: https://storage.googleapis.com/download.tensorflow.org/data/creditcard.csv
Features: Time, V1-V28 (PCA-anonymized from real card data), Amount, Class

Feature engineering maps dataset columns → IPTS 16-feature vector:
  - 8 domain features (amount, hour, day_of_week, freq_7d, is_round,
                        country_risk, sender_id, receiver_id)
  - 8 PCA components (V1, V3, V4, V10, V12, V14, V17, V20)
    — most discriminative per published research on this dataset

Run directly:  python3 train_on_real_data.py
Or triggered via /api/models/retrain  (source=real_data)
"""

import os, json, time, sys
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import (f1_score, accuracy_score, precision_score,
                              recall_score, roc_auc_score, confusion_matrix)
from sklearn.preprocessing import StandardScaler
import xgboost as xgb

DATASET_PATH = os.path.join(os.path.dirname(__file__), "datasets", "creditcard.csv")
MODELS_DIR   = os.path.join(os.path.dirname(__file__), "models")
FEATURE_NAMES = [
    "amount", "hour", "day_of_week", "freq_7d", "is_round",
    "country_risk", "sender_id", "receiver_id",
    "V1", "V3", "V4", "V10", "V12", "V14", "V17", "V20"
]

# ── 1. Load & validate ────────────────────────────────────────────────────────

def load_dataset():
    print(f"[1/6] Loading dataset from {DATASET_PATH}")
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(
            f"Dataset not found at {DATASET_PATH}\n"
            "Download with:\n"
            "  curl -L https://storage.googleapis.com/download.tensorflow.org/data/creditcard.csv "
            "-o .runtime/datasets/creditcard.csv"
        )
    df = pd.read_csv(DATASET_PATH)
    n_fraud = df['Class'].sum()
    n_total = len(df)
    print(f"    ✓ {n_total:,} transactions loaded — {n_fraud} fraud ({n_fraud/n_total*100:.3f}%)")
    return df

# ── 2. Feature engineering ────────────────────────────────────────────────────

def engineer_features(df):
    print("[2/6] Engineering features...")
    fe = pd.DataFrame()

    # --- Domain features ---

    # amount: log-scale normalisation keeps large values from dominating
    fe['amount'] = np.log1p(df['Amount'])

    # hour: Time is seconds elapsed; dataset spans ~48 hours (172,792s)
    # Map into 0-23 hour-of-day assuming cycle repeats every 24h
    fe['hour'] = (df['Time'] % 86400 / 3600).astype(int)

    # day_of_week: which 24h block the transaction falls in (0 or 1 for this 48h dataset)
    fe['day_of_week'] = (df['Time'] // 86400).astype(int) % 7

    # freq_7d: transactions per "sender" in the same hour window — proxy for velocity
    # We use V4 as a cardholder proxy (strong positive fraud correlate) to bin senders
    sender_bins = pd.cut(df['V4'], bins=50, labels=False).fillna(0).astype(int)
    hour_bin = fe['hour']
    fe['freq_7d'] = sender_bins.groupby([sender_bins, hour_bin]).transform('count').clip(1, 40)

    # is_round: amount is a round number (common in structuring/testing fraud)
    fe['is_round'] = (df['Amount'] % 1 == 0).astype(int)

    # country_risk: V3 has strongest negative correlation with fraud in published studies
    # Rescale abs(V3) to [0, 1] where higher = higher risk
    v3_abs = df['V3'].abs()
    fe['country_risk'] = (v3_abs - v3_abs.min()) / (v3_abs.max() - v3_abs.min() + 1e-9)

    # sender_id: cluster cardholders via discretised V1 (captures spending behaviour)
    fe['sender_id'] = pd.cut(df['V1'], bins=500, labels=False).fillna(0).astype(int)

    # receiver_id: cluster merchants via discretised V17 (location/merchant signal)
    fe['receiver_id'] = pd.cut(df['V17'], bins=500, labels=False).fillna(0).astype(int)

    # --- Raw PCA components (8 most discriminative) ---
    # Selected based on feature importance in published ULB benchmark studies:
    # V14, V12, V10, V17 → top fraud signals; V1, V3, V4, V20 → strong secondary signals
    for v in ['V1', 'V3', 'V4', 'V10', 'V12', 'V14', 'V17', 'V20']:
        fe[v] = df[v].values

    fe['is_fraud'] = df['Class'].values

    fraud_count = fe['is_fraud'].sum()
    print(f"    ✓ Feature matrix: {fe.shape[0]:,} rows × {fe.shape[1]-1} features")
    print(f"    ✓ Class balance: {len(fe)-fraud_count:,} normal | {fraud_count} fraud")
    return fe

# ── 3. Split ──────────────────────────────────────────────────────────────────

def make_splits(fe):
    print("[3/6] Splitting train/test (80/20, stratified)...")
    X = fe[FEATURE_NAMES].values
    y = fe['is_fraud'].values
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"    ✓ Train: {len(X_tr):,}  |  Test: {len(X_te):,}")
    print(f"    ✓ Train fraud: {y_tr.sum()} | Test fraud: {y_te.sum()}")
    return X_tr, X_te, y_tr, y_te

# ── 4. Train models ───────────────────────────────────────────────────────────

def train_models(X_tr, X_te, y_tr, y_te):
    print("[4/6] Training models on real data...")
    os.makedirs(MODELS_DIR, exist_ok=True)
    metrics = {}

    # ── Isolation Forest (unsupervised) ───────────────────────────────────────
    print("    → Isolation Forest (unsupervised anomaly detection)...")
    t0 = time.time()
    iso = IsolationForest(
        n_estimators=200,
        contamination=0.00173,   # actual fraud rate in dataset (492/284807)
        max_samples='auto',
        n_jobs=-1,
        random_state=42
    )
    iso.fit(X_tr[y_tr == 0])     # train only on normal transactions
    iso_preds = (iso.predict(X_te) == -1).astype(int)
    metrics['isolation_forest'] = _score(y_te, iso_preds, "Isolation Forest", time.time()-t0)
    joblib.dump(iso, os.path.join(MODELS_DIR, "isolation_forest.pkl"))

    # ── Random Forest ─────────────────────────────────────────────────────────
    print("    → Random Forest (supervised)...")
    t0 = time.time()
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=16,
        min_samples_leaf=5,
        max_features='sqrt',
        class_weight='balanced',
        n_jobs=-1,
        random_state=42
    )
    rf.fit(X_tr, y_tr)
    rf_preds = rf.predict(X_te)
    metrics['random_forest'] = _score(y_te, rf_preds, "Random Forest", time.time()-t0)
    joblib.dump(rf, os.path.join(MODELS_DIR, "random_forest.pkl"))

    # ── XGBoost ───────────────────────────────────────────────────────────────
    print("    → XGBoost (gradient boosting)...")
    t0 = time.time()
    spw = (y_tr == 0).sum() / max((y_tr == 1).sum(), 1)
    xg = xgb.XGBClassifier(
        n_estimators=400,
        max_depth=7,
        learning_rate=0.03,
        scale_pos_weight=spw,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_alpha=0.5,
        reg_lambda=1.5,
        min_child_weight=5,
        eval_metric='logloss',
        n_jobs=-1,
        random_state=42,
        verbosity=0
    )
    xg.fit(
        X_tr, y_tr,
        eval_set=[(X_te, y_te)],
        verbose=False
    )
    xg_preds = xg.predict(X_te)
    metrics['xgboost'] = _score(y_te, xg_preds, "XGBoost", time.time()-t0)
    joblib.dump(xg, os.path.join(MODELS_DIR, "xgboost.pkl"))

    # ── Autoencoder (MLP reconstruction) ─────────────────────────────────────
    print("    → Autoencoder (reconstruction error on normal txns)...")
    t0 = time.time()
    scaler = StandardScaler()
    X_norm_tr = scaler.fit_transform(X_tr[y_tr == 0])
    X_norm_te = scaler.transform(X_te)

    ae = MLPRegressor(
        hidden_layer_sizes=(32, 16, 8, 16, 32),
        activation='relu',
        max_iter=100,
        random_state=42,
        verbose=False,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=10
    )
    ae.fit(X_norm_tr, X_norm_tr)

    # Reconstruction error threshold: 95th percentile on normal test samples
    X_norm_te_normal = X_norm_te[y_te == 0]
    recon_normal = ae.predict(X_norm_te_normal)
    errors_normal = np.mean((X_norm_te_normal - recon_normal) ** 2, axis=1)
    threshold = float(np.percentile(errors_normal, 95))

    recon_all = ae.predict(X_norm_te)
    errors_all = np.mean((X_norm_te - recon_all) ** 2, axis=1)
    ae_preds = (errors_all > threshold).astype(int)
    metrics['autoencoder'] = _score(y_te, ae_preds, "Autoencoder", time.time()-t0)

    # Save scaler alongside autoencoder for inference
    joblib.dump({'model': ae, 'scaler': scaler}, os.path.join(MODELS_DIR, "autoencoder.pkl"))
    joblib.dump(threshold, os.path.join(MODELS_DIR, "ae_threshold.pkl"))

    # ── Sequence Detector (XGBoost on velocity features) ─────────────────────
    print("    → Sequence Detector (velocity + temporal features)...")
    t0 = time.time()
    # Augment with temporal interaction features
    def add_seq_features(X):
        amount_col = X[:, 0]       # log amount
        hour_col   = X[:, 1]       # hour
        freq_col   = X[:, 3]       # freq_7d
        v1_col     = X[:, 8]       # V1
        v14_col    = X[:, 13]      # V14
        interactions = np.column_stack([
            amount_col * freq_col,           # amount × velocity
            hour_col * v14_col,              # time-of-day × merchant signal
            freq_col * v1_col,               # velocity × cardholder behaviour
            amount_col ** 2,                 # non-linear amount
            np.abs(v14_col) * freq_col,      # strong fraud signal × velocity
        ])
        return np.hstack([X, interactions])

    X_tr_seq = add_seq_features(X_tr)
    X_te_seq  = add_seq_features(X_te)

    seq = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.04,
        scale_pos_weight=spw,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric='logloss',
        n_jobs=-1,
        random_state=42,
        verbosity=0
    )
    seq.fit(X_tr_seq, y_tr, eval_set=[(X_te_seq, y_te)], verbose=False)
    seq_preds = seq.predict(X_te_seq)
    metrics['sequence_detector'] = _score(y_te, seq_preds, "Sequence Detector", time.time()-t0)
    joblib.dump(seq, os.path.join(MODELS_DIR, "sequence_detector.pkl"))
    # Save the number of extra columns so inference knows the shape
    joblib.dump({'n_seq_extra': 5}, os.path.join(MODELS_DIR, "sequence_detector_meta.pkl"))

    return metrics, rf, xg, X_te, y_te

# ── 5. SHAP + feature importance ──────────────────────────────────────────────

def save_feature_metadata(rf, xg, X_te, y_te):
    print("[5/6] Computing SHAP values and feature importance...")
    import shap

    # SHAP on XGBoost (fastest + most accurate)
    explainer = shap.TreeExplainer(xg)
    # Use a balanced sample: all fraud + equal normal for speed
    fraud_idx  = np.where(y_te == 1)[0]
    normal_idx = np.random.RandomState(42).choice(
        np.where(y_te == 0)[0], min(len(fraud_idx) * 10, 1000), replace=False
    )
    sample_idx = np.concatenate([fraud_idx, normal_idx])
    shap_values = explainer.shap_values(X_te[sample_idx])

    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    shap_importance = {
        FEATURE_NAMES[i]: round(float(mean_abs_shap[i]), 4)
        for i in range(len(FEATURE_NAMES))
    }
    # Sort descending
    shap_importance = dict(sorted(shap_importance.items(), key=lambda x: -x[1]))

    # RF feature importance
    fi = rf.feature_importances_
    feature_importance = {
        FEATURE_NAMES[i]: round(float(fi[i]), 4)
        for i in range(len(FEATURE_NAMES))
    }
    feature_importance = dict(sorted(feature_importance.items(), key=lambda x: -x[1]))

    with open(os.path.join(MODELS_DIR, "shap_importance.json"), "w") as f:
        json.dump(shap_importance, f, indent=2)
    with open(os.path.join(MODELS_DIR, "feature_importance.json"), "w") as f:
        json.dump(feature_importance, f, indent=2)
    with open(os.path.join(MODELS_DIR, "feature_names.json"), "w") as f:
        json.dump(FEATURE_NAMES, f, indent=2)

    print(f"    ✓ Top 5 SHAP features: {list(shap_importance.keys())[:5]}")
    print(f"    ✓ Top 5 RF importance: {list(feature_importance.keys())[:5]}")

# ── 6. Save metrics ───────────────────────────────────────────────────────────

def save_metrics(metrics):
    print("[6/6] Saving metrics...")
    # Persist only the fields the frontend expects
    out = {
        name: {"f1": m["f1"], "accuracy": m["accuracy"]}
        for name, m in metrics.items()
    }
    with open(os.path.join(MODELS_DIR, "metrics.json"), "w") as f:
        json.dump(out, f, indent=2)

    # Also save extended metrics for reporting
    with open(os.path.join(MODELS_DIR, "metrics_extended.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    print("\n" + "="*60)
    print("  MODEL PERFORMANCE ON ULB CREDIT CARD FRAUD DATASET")
    print("  (284,807 real transactions | 80/20 train-test split)")
    print("="*60)
    for name, m in metrics.items():
        print(f"  {name:<22}  F1={m['f1']:.4f}  Acc={m['accuracy']:.4f}  "
              f"AUC={m.get('auc',0):.4f}  Prec={m.get('precision',0):.4f}  "
              f"Rec={m.get('recall',0):.4f}")
    print("="*60)

# ── helpers ───────────────────────────────────────────────────────────────────

def _score(y_true, y_pred, name, elapsed):
    f1  = f1_score(y_true, y_pred, zero_division=0)
    acc = accuracy_score(y_true, y_pred)
    pre = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    try:
        auc = roc_auc_score(y_true, y_pred)
    except Exception:
        auc = 0.0
    cm  = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
    print(f"      F1={f1:.4f}  Acc={acc:.4f}  AUC={auc:.4f}  "
          f"Prec={pre:.4f}  Rec={rec:.4f}  "
          f"TP={tp} FP={fp} FN={fn} TN={tn}  [{elapsed:.1f}s]")
    return {"f1": round(f1,4), "accuracy": round(acc,4),
            "precision": round(pre,4), "recall": round(rec,4),
            "auc": round(auc,4), "tp": int(tp), "fp": int(fp),
            "fn": int(fn), "tn": int(tn),
            "dataset": "ULB Credit Card Fraud (real)", "trained_at": time.strftime("%Y-%m-%d %H:%M:%S")}

# ── main ──────────────────────────────────────────────────────────────────────

def run(progress_callback=None):
    t_start = time.time()
    def log(msg):
        print(msg)
        if progress_callback:
            progress_callback(msg)

    df          = load_dataset()
    fe          = engineer_features(df)
    X_tr, X_te, y_tr, y_te = make_splits(fe)
    metrics, rf, xg, X_te_out, y_te_out = train_models(X_tr, X_te, y_tr, y_te)
    save_feature_metadata(rf, xg, X_te_out, y_te_out)
    save_metrics(metrics)

    elapsed = time.time() - t_start
    print(f"\n✅ All models trained on real data in {elapsed:.1f}s")
    print(f"   Models saved to: {MODELS_DIR}/")
    return metrics

if __name__ == "__main__":
    run()
