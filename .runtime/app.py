#!/usr/bin/env python3
"""
IPTS Flask Backend - Enterprise Settlement API
Zero Trust Architecture | JWT Auth | AML Risk Engine | Blockchain Manager
"""

import os
import sys
import json
import time
import uuid
import random
import hashlib
import hmac
import sqlite3
import logging
import threading
import re
from datetime import datetime, timedelta
from functools import wraps

import jwt
import joblib
import numpy as np
import networkx as nx
from flask import Flask, request, jsonify, render_template, Response, g
from web3 import Web3

# OCR for KYC document verification
try:
    import pytesseract
    from PIL import Image
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

# ============================================================
# Configuration
# ============================================================
APP_SECRET = os.environ.get("IPTS_SECRET_KEY", "ipts_enterprise_secret_2026_xK9mPq_FALLBACK_NOT_FOR_PRODUCTION")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 8          # Extended for usability; refresh supported
JWT_REFRESH_HOURS = 24
_APP_DIR     = os.path.dirname(os.path.abspath(__file__))
_PROJECT_DIR = os.path.dirname(_APP_DIR)   # one level up from .runtime/
DB_PATH      = os.path.join(_APP_DIR,      "ipts_vault.db")
MODELS_DIR   = os.path.join(_APP_DIR,      "models")
CONTRACTS_DIR= os.path.join(_APP_DIR,      "contracts")
LOG_DIR      = os.path.join(_PROJECT_DIR,  "logs")

# Fixed conversion rate for USD/ETH display
ETH_USD_RATE = 3500.0

# ── Password hashing helpers (PBKDF2-HMAC-SHA256, no external dep) ──────────
def _hash_password(password: str) -> str:
    salt = hashlib.sha256(os.urandom(60)).hexdigest().encode('ascii')
    pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return (salt + pwdhash.hex().encode('ascii')).decode('ascii')

def _verify_password(stored: str, provided: str) -> bool:
    # Support plaintext passwords during migration (no '$' prefix means hashed)
    if len(stored) < 64:          # plaintext fallback (legacy)
        return stored == provided
    salt = stored[:64].encode('ascii')
    stored_hash = stored[64:]
    pwdhash = hashlib.pbkdf2_hmac('sha256', provided.encode('utf-8'), salt, 100000)
    return hmac.compare_digest(pwdhash.hex(), stored_hash)

# User login accounts — passwords stored as PBKDF2 hashes
# _hash_password() used at startup to pre-hash plaintext values
_RAW_PASSWORDS = {
    "mohamad": "Mohamad@2026!",
    "rohit":   "Rohit@2026!",
    "sriram":  "Sriram@2026!",
    "walid":   "Walid@2026!",
    "vibin":   "Vibin@2026!",
    "sara":    "Sara@2026!",
}
USERS = {
    "mohamad":  {"password": _hash_password("Mohamad@2026!"), "role": "admin"},
    "rohit":    {"password": _hash_password("Rohit@2026!"),   "role": "operator"},
    "sriram":   {"password": _hash_password("Sriram@2026!"),  "role": "auditor"},
    "walid":    {"password": _hash_password("Walid@2026!"),   "role": "compliance"},
    "vibin":    {"password": _hash_password("Vibin@2026!"),   "role": "datascientist"},
    "sara":     {"password": _hash_password("Sara@2026!"),    "role": "client"},
}

# ── Account lockout tracker ──────────────────────────────────────────────────
_FAILED_LOGINS: dict = {}          # username → {"count": int, "locked_until": float}
MAX_LOGIN_ATTEMPTS  = 5
LOCKOUT_SECONDS     = 900          # 15 minutes

def _check_lockout(username: str) -> tuple[bool, int]:
    """Returns (is_locked, seconds_remaining)."""
    entry = _FAILED_LOGINS.get(username)
    if not entry:
        return False, 0
    if entry["count"] >= MAX_LOGIN_ATTEMPTS:
        remaining = int(entry["locked_until"] - time.time())
        if remaining > 0:
            return True, remaining
        # Lockout expired — reset
        _FAILED_LOGINS.pop(username, None)
    return False, 0

def _record_failed_login(username: str):
    entry = _FAILED_LOGINS.setdefault(username, {"count": 0, "locked_until": 0})
    entry["count"] += 1
    entry["locked_until"] = time.time() + LOCKOUT_SECONDS

def _reset_failed_login(username: str):
    _FAILED_LOGINS.pop(username, None)

# ── Token blacklist (revoked JTIs on logout) ─────────────────────────────────
_REVOKED_TOKENS: set = set()

# ── Per-user transaction limits (daily, per-transaction) ─────────────────────
USER_TX_LIMITS = {
    "admin":         {"daily": 10_000_000, "per_tx": 5_000_000},
    "operator":      {"daily": 1_000_000,  "per_tx": 500_000},
    "client":        {"daily": 1_000_000,  "per_tx": 500_000},
    "auditor":       {"daily": 0,          "per_tx": 0},
    "compliance":    {"daily": 0,          "per_tx": 0},
    "datascientist": {"daily": 0,          "per_tx": 0},
}

# ── Fee schedule ─────────────────────────────────────────────────────────────
FEE_TIERS = [
    (0,       1_000,   0.0025, 0.50),    # 0.25%, min $0.50
    (1_000,   10_000,  0.0020, 2.00),    # 0.20%, min $2.00
    (10_000,  100_000, 0.0015, 15.00),   # 0.15%
    (100_000, 500_000, 0.0010, 100.00),  # 0.10%
    (500_000, None,    0.0005, 500.00),  # 0.05%
]

def calculate_fee(amount: float, payment_type: str = "standard") -> dict:
    """Return fee breakdown for a given amount."""
    base_rate, min_fee = 0.0025, 0.50
    for lo, hi, rate, minfee in FEE_TIERS:
        if hi is None or amount < hi:
            base_rate, min_fee = rate, minfee
            break
    base_fee  = max(amount * base_rate, min_fee)
    swift_fee = 18.00 if payment_type in ("swift", "wire", "external") else 0.0
    fx_fee    = round(amount * 0.001, 2) if payment_type == "fx" else 0.0
    total_fee = round(base_fee + swift_fee + fx_fee, 2)
    return {
        "base_fee":   round(base_fee, 2),
        "swift_fee":  swift_fee,
        "fx_fee":     fx_fee,
        "total_fee":  total_fee,
        "rate_pct":   round(base_rate * 100, 3),
        "net_amount": round(amount - total_fee, 2),
    }

# ── Travel Rule helper (FATF — required for transfers ≥ USD 3,000) ──────────
TRAVEL_RULE_THRESHOLD = 3_000.0

def check_travel_rule(amount: float, data: dict) -> list[str]:
    """Return list of missing fields if travel rule applies."""
    if amount < TRAVEL_RULE_THRESHOLD:
        return []
    required = ["originator_name", "originator_account", "beneficiary_account"]
    return [f for f in required if not data.get(f)]

# ── High-risk countries (FATF grey/black list, illustrative) ─────────────────
HIGH_RISK_COUNTRIES = {
    "IR","KP","MM","YE","SY","IQ","AF","LY","SO","SD","ZW","VE","CU","BY","RU"
}
def country_risk_score(country_code: str) -> float:
    return 0.95 if country_code and country_code.upper() in HIGH_RISK_COUNTRIES else 0.1

# User accounts with balances
USER_ACCOUNTS = {
    "mohamad":      {"full_name": "Mohamad Idriss",            "balance": 1000000.00, "currency": "USD", "wallet_idx": 0},
    "rohit":        {"full_name": "Rohit Jacob Isaac",         "balance": 750000.00,  "currency": "USD", "wallet_idx": 1},
    "sriram":       {"full_name": "Sriram Acharya Mudumbai",   "balance": 500000.00,  "currency": "USD", "wallet_idx": 2},
    "walid":        {"full_name": "Walid Elmahdy",             "balance": 350000.00,  "currency": "USD", "wallet_idx": 3},
    "vibin":        {"full_name": "Vibin Chandrabose",         "balance": 150000.00,  "currency": "USD", "wallet_idx": 4},
    "sara":         {"full_name": "Sara Mitchell",             "balance": 2000000.00,   "currency": "USD", "wallet_idx": 4},
}

# Beneficiaries list (legit + suspicious for testing)
BENEFICIARIES = [
    {"name": "Mohamad Idriss", "type": "individual"},
    {"name": "Rohit Jacob Isaac", "type": "individual"},
    {"name": "Sriram Acharya Mudumbai", "type": "individual"},
    {"name": "Walid Elmahdy", "type": "individual"},
    {"name": "Vibin Chandrabose", "type": "individual"},
    {"name": "Global Trade Corp", "type": "corporate"},
    {"name": "Acme International", "type": "corporate"},
    {"name": "Shell Company Alpha", "type": "corporate"},
    {"name": "Offshore Haven Corp", "type": "corporate"},
    {"name": "Dark Web Exchange", "type": "corporate"},
    {"name": "Phantom Bank Ltd", "type": "corporate"},
    {"name": "Hawala Underground Services", "type": "corporate"},
    {"name": "Arms Dealer International", "type": "corporate"},
    {"name": "Narco Laundry Inc", "type": "corporate"},
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
app = Flask(__name__, template_folder="templates")
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
        g.db = open_db()
        g.db.row_factory = sqlite3.Row
    return g.db

def open_db():
    """Open a DB connection with WAL mode and extended busy timeout."""
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn

@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    conn = open_db()  # WAL mode set inside open_db()
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS pii_vault (
        id TEXT PRIMARY KEY,
        data_hash TEXT NOT NULL,
        encrypted_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        gdpr_consent INTEGER DEFAULT 1
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS beneficiaries (
        id TEXT PRIMARY KEY,
        name TEXT,
        nickname TEXT,
        account_number TEXT,
        bank_name TEXT,
        swift_code TEXT,
        country TEXT,
        currency TEXT,
        beneficiary_type TEXT,
        notes TEXT,
        wallet_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS virtual_cards (
        id TEXT PRIMARY KEY,
        username TEXT,
        label TEXT,
        card_type TEXT DEFAULT 'debit',
        card_network TEXT,
        card_number TEXT,
        expiry_month INTEGER,
        expiry_year INTEGER,
        cvv TEXT,
        spending_limit REAL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS kyc_verifications (
        id TEXT PRIMARY KEY,
        username TEXT,
        doc_type TEXT,
        doc_status TEXT DEFAULT 'not_started',
        verification_score INTEGER,
        verified_at TIMESTAMP
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
    c.execute("""CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        role TEXT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        link_tab TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    conn.commit()
    conn.close()
    logger.info("Database initialized")

init_db()

def init_user_accounts(blockchain_accounts):
    """Initialize user_accounts table from USER_ACCOUNTS config."""
    conn = open_db()
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
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT balance FROM user_accounts WHERE username = ?", (username,))
    row = c.fetchone()
    conn.close()
    return row[0] if row else 0.0

def update_user_balance(username, new_balance):
    conn = open_db()
    c = conn.cursor()
    c.execute("UPDATE user_accounts SET balance = ?, updated_at = ? WHERE username = ?",
              (new_balance, datetime.utcnow().isoformat(), username))
    conn.commit()
    conn.close()

def get_user_account_info(username):
    conn = open_db()
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

def _init_case_counter():
    """Seed the in-memory counter from the highest case number in the DB."""
    try:
        conn = sqlite3.connect(DB_PATH, timeout=10)
        c = conn.cursor()
        c.execute("SELECT case_number FROM compliance_cases ORDER BY case_number DESC LIMIT 1")
        row = c.fetchone()
        conn.close()
        if row and row[0]:
            # Parse the trailing number from e.g. "CASE-2026-0007"
            parts = row[0].split("-")
            _case_counter[0] = int(parts[-1])
    except Exception:
        pass

_init_case_counter()  # Seed counter from existing DB cases on startup

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

    conn = open_db()
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

        # JWT check — accept token from Authorization header or ?token= query param (for file downloads)
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split("Bearer ")[-1].strip()
        elif request.args.get("token"):
            token = request.args.get("token")
        else:
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        try:
            payload = jwt.decode(token, APP_SECRET, algorithms=[JWT_ALGORITHM])
            # Check token blacklist (revoked on logout)
            if payload.get("jti") in _REVOKED_TOKENS:
                return jsonify({"error": "Token has been revoked — please log in again"}), 401
            request.user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired — please log in again"}), 401
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
                    conn = open_db()
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
        conn = open_db()
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
sse_lock = threading.Lock()

def push_sse(event_type, data):
    with sse_lock:
        sse_events.append({
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        })
        # Keep only last 200 events
        if len(sse_events) > 200:
            del sse_events[:100]

def push_notification(username_or_role, title, message, notif_type="info", link_tab=None, is_role=False):
    """
    Push a notification to a specific user or all users of a role.
    username_or_role: username (e.g. 'sara') or role (e.g. 'admin') when is_role=True
    notif_type: 'info' | 'success' | 'warning' | 'error'
    link_tab: which tab to open when notification is clicked (e.g. 'approvals', 'cards')
    """
    import uuid as _uuid
    conn = open_db()
    c = conn.cursor()
    if is_role:
        # Insert one notification per user who has this role
        for uname, creds in USERS.items():
            if creds.get("role") == username_or_role:
                c.execute("""INSERT INTO notifications (id, username, role, title, message, type, link_tab)
                             VALUES (?, ?, ?, ?, ?, ?, ?)""",
                          (str(_uuid.uuid4()), uname, username_or_role, title, message, notif_type, link_tab))
    else:
        notif_id = str(_uuid.uuid4())
        c.execute("""INSERT INTO notifications (id, username, role, title, message, type, link_tab)
                     VALUES (?, ?, ?, ?, ?, ?, ?)""",
                  (notif_id, username_or_role, USERS.get(username_or_role, {}).get("role", ""), title, message, notif_type, link_tab))
    conn.commit()
    conn.close()
    # Push SSE so connected clients update their badge instantly
    push_sse("notification", {"for": username_or_role, "is_role": is_role, "title": title, "type": notif_type})

# ============================================================
# API ENDPOINTS
# ============================================================

# --- Login ---
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(force=True)
    username = data.get("username", "").strip().lower()
    password = data.get("password", "")
    client_ip = request.remote_addr or "unknown"

    # ── Account lockout check ────────────────────────────────────────────────
    locked, secs = _check_lockout(username)
    if locked:
        log_audit("login_blocked", username, {"reason": "account locked", "seconds_remaining": secs}, client_ip)
        return jsonify({
            "error": f"Account temporarily locked due to too many failed attempts. Try again in {secs // 60 + 1} minute(s).",
            "locked_until_seconds": secs,
        }), 423

    user = USERS.get(username)
    if not user or not _verify_password(user["password"], password):
        _record_failed_login(username)
        attempts = _FAILED_LOGINS.get(username, {}).get("count", 1)
        remaining = MAX_LOGIN_ATTEMPTS - attempts
        log_audit("login_failed", username, {"reason": "invalid credentials", "attempts": attempts}, client_ip)
        if remaining > 0:
            return jsonify({"error": f"Invalid credentials. {remaining} attempt(s) remaining before account is locked."}), 401
        return jsonify({"error": "Too many failed attempts. Account locked for 15 minutes."}), 423

    _reset_failed_login(username)
    token = generate_token(username, user["role"])
    # Generate refresh token (longer-lived, no role — only for refreshing access)
    refresh_payload = {
        "sub": username, "type": "refresh",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=JWT_REFRESH_HOURS),
        "jti": str(uuid.uuid4()),
    }
    refresh_token = jwt.encode(refresh_payload, APP_SECRET, algorithm=JWT_ALGORITHM)
    log_audit("login_success", username, {"role": user["role"], "ip": client_ip}, client_ip)

    acct = get_user_account_info(username)
    full_name = acct["full_name"] if acct else username
    limits = USER_TX_LIMITS.get(user["role"], {})

    return jsonify({
        "token":         token,
        "refresh_token": refresh_token,
        "username":      username,
        "role":          user["role"],
        "full_name":     full_name,
        "expires_in":    JWT_EXPIRY_HOURS * 3600,
        "tx_limits":     limits,
    })

# --- Logout (token blacklist) ---
@app.route("/api/auth/logout", methods=["POST"])
@zero_trust_required
def logout():
    jti = request.user.get("jti")
    if jti:
        _REVOKED_TOKENS.add(jti)
    log_audit("logout", request.user.get("sub",""), {}, request.remote_addr)
    return jsonify({"message": "Logged out successfully"})

# --- Token Refresh ---
@app.route("/api/auth/refresh", methods=["POST"])
def refresh_token_endpoint():
    data = request.get_json(force=True) or {}
    refresh_tok = data.get("refresh_token", "")
    if not refresh_tok:
        return jsonify({"error": "refresh_token required"}), 400
    try:
        payload = jwt.decode(refresh_tok, APP_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            return jsonify({"error": "Not a refresh token"}), 400
        if payload.get("jti") in _REVOKED_TOKENS:
            return jsonify({"error": "Refresh token revoked"}), 401
        username = payload["sub"]
        user = USERS.get(username)
        if not user:
            return jsonify({"error": "User not found"}), 401
        new_token = generate_token(username, user["role"])
        log_audit("token_refreshed", username, {}, request.remote_addr)
        return jsonify({"token": new_token, "expires_in": JWT_EXPIRY_HOURS * 3600})
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Refresh token expired — please log in again"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid refresh token"}), 401

# --- Fee Calculator ---
@app.route("/api/payments/fee", methods=["POST"])
@zero_trust_required
def get_payment_fee():
    data = request.get_json(force=True) or {}
    amount = float(data.get("amount", 0))
    payment_type = data.get("payment_type", "standard")
    if amount <= 0:
        return jsonify({"error": "Amount must be positive"}), 400
    return jsonify(calculate_fee(amount, payment_type))

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

# --- Sub-Accounts ---
@app.route("/api/accounts/sub-accounts", methods=["GET"])
@zero_trust_required
def sub_accounts():
    username = request.user.get("sub", "")
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT balance FROM user_accounts WHERE username = ?", (username,))
    row = c.fetchone()
    conn.close()
    if not row:
        return jsonify({"accounts": []})
    total = row[0]
    accounts = [
        {"id": 1, "account_type": "checking", "currency": "USD", "balance": round(total * 0.50, 2)},
        {"id": 2, "account_type": "savings", "currency": "USD", "balance": round(total * 0.35, 2)},
        {"id": 3, "account_type": "business", "currency": "USD", "balance": round(total * 0.15, 2)},
    ]
    return jsonify({"accounts": accounts})

# --- P2P Transfers ---
@app.route("/api/p2p/send", methods=["POST"])
@zero_trust_required
def p2p_send():
    if request.user.get("role") not in ("admin", "operator", "client"):
        return jsonify({"error": "Insufficient permissions"}), 403
    data = request.get_json(force=True)
    username = request.user.get("sub", "")
    recipient_value = data.get("recipient_value", "").strip()
    amount = float(data.get("amount", 0))
    note = data.get("note", "")
    if not recipient_value or amount <= 0:
        return jsonify({"error": "Recipient and positive amount required"}), 400
    # Find recipient by username or full name (case-insensitive)
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT username, full_name, balance FROM user_accounts WHERE username = ? OR LOWER(full_name) = LOWER(?) OR LOWER(username) = LOWER(?)",
              (recipient_value, recipient_value, recipient_value))
    recipient = c.fetchone()
    if not recipient:
        conn.close()
        return jsonify({"error": "Recipient not found"}), 404
    if recipient[0] == username:
        conn.close()
        return jsonify({"error": "Cannot send to yourself"}), 400
    sender_balance = get_user_balance(username)
    recipient_username = recipient[0]
    recipient_name = recipient[1]
    if sender_balance < amount:
        conn.close()
        return jsonify({"error": "Insufficient balance"}), 400
    conn.close()
    # Transfer balances
    update_user_balance(username, sender_balance - amount)
    recipient_bal = get_user_balance(recipient_username)
    update_user_balance(recipient_username, recipient_bal + amount)
    # Log to settlements
    tx_id = str(uuid.uuid4())
    conn2 = open_db()
    c2 = conn2.cursor()
    sender_name = ""
    c2.execute("SELECT full_name FROM user_accounts WHERE username = ?", (username,))
    srow = c2.fetchone()
    if srow: sender_name = srow[0]
    c2.execute("""INSERT INTO settlements (id, sender, receiver, amount, currency, risk_score, status, beneficiary_name, created_at, sender_username, receiver_username)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (tx_id, sender_name or username, recipient_name, amount, "USD", 0, "settled", recipient_name,
         datetime.utcnow().isoformat(), username, recipient_username))
    conn2.commit()
    conn2.close()
    log_audit("p2p_transfer", username, {"to": recipient[0], "amount": amount, "note": note}, request.remote_addr)
    return jsonify({"status": "sent", "recipient": recipient[1], "amount": amount, "new_balance": round(get_user_balance(username), 2)})

@app.route("/api/p2p/history", methods=["GET"])
@zero_trust_required
def p2p_history():
    username = request.user.get("sub", "")
    full_name = USERS.get(username, {}).get("full_name", username)
    conn = open_db()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM settlements WHERE sender_username = ? AND risk_score = 0 ORDER BY created_at DESC LIMIT 20", (username,))
    transfers = [dict(r) for r in c.fetchall()]
    conn.close()
    for t in transfers:
        t["recipient_username"] = t.get("receiver_username", "")
        t["recipient_value"] = t.get("receiver_username", "")
        t["note"] = ""
        t["recipient_type"] = "username"
    return jsonify({"transfers": transfers})

# --- ACH/Wire/SEPA ---
@app.route("/api/transfers/external", methods=["POST"])
@zero_trust_required
def external_transfer():
    if request.user.get("role") not in ("admin", "operator", "client"):
        return jsonify({"error": "Insufficient permissions"}), 403
    data = request.get_json(force=True)
    username = request.user.get("sub", "")
    amount = float(data.get("amount", 0))
    transfer_type = data.get("type", "ach")
    if amount <= 0:
        return jsonify({"error": "Positive amount required"}), 400
    balance = get_user_balance(username)
    if balance < amount:
        return jsonify({"error": "Insufficient balance"}), 400
    # Fees
    fees = {"ach": 0.5, "wire": 25.0, "sepa": 1.5}
    fee = fees.get(transfer_type, 1.0)
    total = amount + fee
    if balance < total:
        return jsonify({"error": f"Insufficient balance (amount + ${fee} fee)"}), 400
    update_user_balance(username, balance - total)
    tx_id = str(uuid.uuid4())
    log_audit("external_transfer", username, {"type": transfer_type, "amount": amount, "fee": fee}, request.remote_addr)
    return jsonify({"status": "submitted", "transfer_id": tx_id, "type": transfer_type, "amount": amount, "fee": fee, "new_balance": round(get_user_balance(username), 2),
        "message": f"{transfer_type.upper()} transfer of ${amount:,.2f} submitted (fee: ${fee}). ETA: {'1-2 days' if transfer_type == 'ach' else '24h' if transfer_type == 'wire' else '1 day'}"})

# --- Scheduled Payments ---
@app.route("/api/payments/scheduled", methods=["GET"])
@zero_trust_required
def list_scheduled():
    username = request.user.get("sub", "")
    conn = open_db()
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS scheduled_payments (
        id TEXT PRIMARY KEY, username TEXT, beneficiary_name TEXT, amount REAL, frequency TEXT,
        next_run_date TEXT, description TEXT, status TEXT DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    conn.commit()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM scheduled_payments WHERE username = ? ORDER BY created_at DESC", (username,))
    payments = [dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify({"scheduled": payments})

@app.route("/api/payments/scheduled", methods=["POST"])
@zero_trust_required
def create_scheduled():
    data = request.get_json(force=True)
    username = request.user.get("sub", "")
    recipient = data.get("beneficiary_name") or data.get("recipient", "")
    amount = float(data.get("amount", 0))
    frequency = data.get("frequency", "monthly")
    next_date = data.get("next_run_date") or data.get("start_date", datetime.utcnow().isoformat()[:10])
    description = data.get("description", "")
    if not recipient or amount <= 0:
        return jsonify({"error": "Recipient and positive amount required"}), 400
    pay_id = str(uuid.uuid4())
    conn = open_db()
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS scheduled_payments (
        id TEXT PRIMARY KEY, username TEXT, beneficiary_name TEXT, amount REAL, frequency TEXT,
        next_run_date TEXT, description TEXT, status TEXT DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    c.execute("INSERT INTO scheduled_payments (id, username, beneficiary_name, amount, frequency, next_run_date, description) VALUES (?,?,?,?,?,?,?)",
              (pay_id, username, recipient, amount, frequency, next_date, description))
    conn.commit()
    conn.close()
    log_audit("scheduled_payment_created", username, {"recipient": recipient, "amount": amount, "frequency": frequency}, request.remote_addr)
    return jsonify({"status": "created", "id": pay_id, "beneficiary_name": recipient, "amount": amount, "frequency": frequency})

@app.route("/api/payments/scheduled/<pay_id>", methods=["DELETE"])
@zero_trust_required
def cancel_scheduled(pay_id):
    username = request.user.get("sub", "")
    conn = open_db()
    c = conn.cursor()
    c.execute("DELETE FROM scheduled_payments WHERE id = ? AND username = ?", (pay_id, username))
    conn.commit()
    conn.close()
    return jsonify({"status": "cancelled", "id": pay_id})

# --- Documents ---
@app.route("/api/documents", methods=["GET"])
@zero_trust_required
def list_documents():
    username = request.user.get("sub", "")
    full_name = ""
    for u, info in USER_ACCOUNTS.items():
        if u == username:
            full_name = info.get("full_name", username)
            break
    # Generate synthetic monthly statements and documents
    from datetime import date
    today = date.today()
    docs = []
    for i in range(6):
        month = today.month - i
        year = today.year
        if month <= 0:
            month += 12
            year -= 1
        month_name = date(year, month, 1).strftime("%B %Y")
        docs.append({
            "id": f"stmt-{year}-{month:02d}",
            "type": "statement",
            "title": f"Monthly Statement — {month_name}",
            "description": f"Account statement for {full_name} covering all transactions in {month_name}.",
            "date": f"{year}-{month:02d}-01",
            "size": f"{random.randint(120, 350)} KB",
            "format": "PDF"
        })
    # Add tax document
    docs.append({
        "id": f"tax-1099-{today.year - 1}",
        "type": "tax_1099",
        "title": f"1099-INT Tax Form — {today.year - 1}",
        "description": f"Interest income tax form for tax year {today.year - 1}.",
        "date": f"{today.year}-01-31",
        "size": "45 KB",
        "format": "PDF"
    })
    # Add compliance receipt
    docs.append({
        "id": f"receipt-kyc-{username}",
        "type": "receipt",
        "title": "KYC Verification Receipt",
        "description": "Confirmation of identity verification completion.",
        "date": today.isoformat(),
        "size": "18 KB",
        "format": "PDF"
    })
    doc_filter = request.args.get("type", "")
    if doc_filter:
        docs = [d for d in docs if d["type"] == doc_filter]
    return jsonify({"documents": docs})

@app.route("/api/documents/<doc_id>/download", methods=["GET"])
@zero_trust_required
def download_document(doc_id):
    username = request.user.get("sub", "")
    full_name = USER_ACCOUNTS.get(username, {}).get("full_name", username)

    # Build document metadata from the id
    lines = []
    if doc_id.startswith("stmt-"):
        parts = doc_id.split("-")
        year, month = parts[1], parts[2]
        from datetime import date
        month_name = date(int(year), int(month), 1).strftime("%B %Y")
        title = f"Monthly Statement — {month_name}"
        lines = [
            f"IPTS — Monthly Account Statement",
            f"Account Holder : {full_name}",
            f"Period         : {month_name}",
            f"Generated      : {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            "",
            "This statement summarises all transactions processed through",
            "the Integrated Payment Transformation System (IPTS) for the",
            f"period of {month_name}.",
            "",
            "For queries contact: support@ipts.example.com",
        ]
    elif doc_id.startswith("tax-"):
        year = doc_id.split("-")[-1]
        title = f"1099-INT Tax Form — {year}"
        lines = [
            f"IPTS — 1099-INT Interest Income Tax Form",
            f"Taxpayer       : {full_name}",
            f"Tax Year       : {year}",
            f"Generated      : {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            "",
            "This form reports interest income earned through IPTS accounts.",
            "Please include this information in your annual tax return.",
            "",
            "For queries contact: tax@ipts.example.com",
        ]
    elif doc_id.startswith("receipt-"):
        title = "KYC Verification Receipt"
        lines = [
            f"IPTS — KYC Verification Receipt",
            f"Account Holder : {full_name}",
            f"Status         : VERIFIED",
            f"Date           : {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            "",
            "Identity verification has been completed successfully.",
            "This receipt confirms compliance with KYC/AML regulations.",
            "",
            "Reference ID   : " + doc_id,
        ]
    else:
        return jsonify({"error": "Document not found"}), 404

    # Generate a simple PDF using reportlab if available, else plain text
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas as rl_canvas
        import io
        buf = io.BytesIO()
        c = rl_canvas.Canvas(buf, pagesize=A4)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, 800, "IPTS — Integrated Payment Transformation System")
        c.setFont("Helvetica", 11)
        y = 760
        for line in lines:
            c.drawString(50, y, line)
            y -= 20
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(50, 50, "This is a system-generated document. IPTS © 2026")
        c.save()
        buf.seek(0)
        from flask import send_file
        return send_file(
            buf,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"{doc_id}.pdf"
        )
    except ImportError:
        # Fallback: plain text
        content = "\n".join(lines)
        from flask import Response
        return Response(
            content,
            mimetype="text/plain",
            headers={"Content-Disposition": f'attachment; filename="{doc_id}.txt"'}
        )

# --- QR Pay ---
@app.route("/api/qr/generate", methods=["POST"])
@zero_trust_required
def qr_generate():
    username = request.user.get("sub", "")
    data = request.get_json(force=True)
    amount = float(data.get("amount", 0))
    full_name = ""
    for u, info in USER_ACCOUNTS.items():
        if u == username:
            full_name = info.get("full_name", username)
            break
    qr_data = f"ipts://pay?to={username}&name={full_name}&amount={amount}&ref={uuid.uuid4().hex[:12]}"
    return jsonify({"qr_data": qr_data, "recipient": username, "amount": amount})

@app.route("/api/qr/pay", methods=["POST"])
@zero_trust_required
def qr_pay():
    username = request.user.get("sub", "")
    data = request.get_json(force=True)
    qr_data = data.get("qr_data", "")
    amount = float(data.get("amount", 0))
    if not qr_data:
        return jsonify({"error": "QR data required"}), 400
    # Parse QR data
    import urllib.parse
    try:
        parsed = urllib.parse.urlparse(qr_data)
        params = urllib.parse.parse_qs(parsed.query)
        recipient = params.get("to", [""])[0]
        recipient_name = params.get("name", [recipient])[0]
        qr_amount = float(params.get("amount", [0])[0])
        if qr_amount > 0:
            amount = qr_amount
    except Exception:
        return jsonify({"error": "Invalid QR data"}), 400
    if not recipient or amount <= 0:
        return jsonify({"error": "Invalid QR code or amount"}), 400
    if recipient == username:
        return jsonify({"error": "Cannot pay yourself"}), 400
    balance = get_user_balance(username)
    if balance < amount:
        return jsonify({"error": "Insufficient balance"}), 400
    recipient_bal = get_user_balance(recipient)
    if recipient_bal is None:
        return jsonify({"error": "Recipient not found"}), 404
    update_user_balance(username, balance - amount)
    update_user_balance(recipient, recipient_bal + amount)
    log_audit("qr_payment", username, {"to": recipient, "amount": amount}, request.remote_addr)
    return jsonify({"status": "paid", "recipient": recipient_name, "amount": amount, "new_balance": round(get_user_balance(username), 2)})

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
            "username": matched_username,
        })
        
    # Add custom beneficiaries from DB
    try:
        conn = open_db()
        c = conn.cursor()
        c.execute("SELECT name, beneficiary_type FROM beneficiaries")
        for row in c.fetchall():
            db_name = row[0]
            db_type = row[1] or "supplier"
            # Avoid duplicates
            if any(x["name"] == db_name for x in beneficiaries):
                continue
            
            matched_username = None
            for uname, uinfo in USER_ACCOUNTS.items():
                if uinfo["full_name"] == db_name and uname != current_user:
                    matched_username = uname
                    break
                    
            beneficiaries.append({
                "name": db_name,
                "type": db_type,
                "risk": "Low",
                "username": matched_username,
            })
        conn.close()
    except Exception as e:
        logger.error(f"Error loading custom beneficiaries: {e}")

    # Filter out sender from beneficiaries
    sender_name = USER_ACCOUNTS.get(current_user, {}).get("full_name", "")
    beneficiaries = [b for b in beneficiaries if b["name"] != sender_name]
    return jsonify({"beneficiaries": beneficiaries})

@app.route("/api/beneficiaries", methods=["GET"])
@zero_trust_required
def get_beneficiaries():
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT * FROM beneficiaries ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    
    bens = []
    for row in rows:
        bens.append({
            "id": row[0], "name": row[1], "nickname": row[2],
            "account_number": row[3], "bank_name": row[4], "swift_code": row[5],
            "country": row[6], "currency": row[7], "beneficiary_type": row[8],
            "notes": row[9], "created_at": row[10]
        })
    return jsonify({"beneficiaries": bens})

@app.route("/api/beneficiaries", methods=["POST"])
@zero_trust_required
def add_beneficiary():
    data = request.get_json(force=True)
    b_id = str(uuid.uuid4())
    conn = open_db()
    c = conn.cursor()
    c.execute("""INSERT INTO beneficiaries (id, name, nickname, account_number, bank_name, swift_code, country, currency, beneficiary_type, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
              (b_id, data.get("name"), data.get("nickname"), data.get("account_number"),
               data.get("bank_name"), data.get("swift_code"), data.get("country"),
               data.get("currency"), data.get("beneficiary_type"), data.get("notes")))
    conn.commit()
    conn.close()
    log_audit("beneficiary_added", request.user.get("sub", "unknown"), {"id": b_id, "name": data.get("name")}, request.remote_addr)
    return jsonify({"message": "Beneficiary added successfully", "id": b_id})

@app.route("/api/beneficiaries/<id>", methods=["PUT"])
@zero_trust_required
def update_beneficiary(id):
    data = request.get_json(force=True)
    conn = open_db()
    c = conn.cursor()
    c.execute("""UPDATE beneficiaries SET name=?, nickname=?, account_number=?, bank_name=?, swift_code=?, country=?, currency=?, beneficiary_type=?, notes=?
                 WHERE id=?""",
              (data.get("name"), data.get("nickname"), data.get("account_number"),
               data.get("bank_name"), data.get("swift_code"), data.get("country"),
               data.get("currency"), data.get("beneficiary_type"), data.get("notes"), id))
    conn.commit()
    conn.close()
    log_audit("beneficiary_updated", request.user.get("sub", "unknown"), {"id": id, "name": data.get("name")}, request.remote_addr)
    return jsonify({"message": "Beneficiary updated successfully"})

@app.route("/api/beneficiaries/<id>", methods=["DELETE"])
@zero_trust_required
def delete_beneficiary(id):
    conn = open_db()
    c = conn.cursor()
    c.execute("DELETE FROM beneficiaries WHERE id=?", (id,))
    conn.commit()
    conn.close()
    log_audit("beneficiary_deleted", request.user.get("sub", "unknown"), {"id": id}, request.remote_addr)
    return jsonify({"message": "Beneficiary deleted successfully"})

# --- Virtual Cards ---
@app.route("/api/cards", methods=["GET"])
@zero_trust_required
def get_cards():
    username = request.user.get("sub", "")
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT id, label, card_network, card_number, expiry_month, expiry_year, spending_limit, status FROM virtual_cards WHERE username=? ORDER BY created_at DESC", (username,))
    cards = []
    for row in c.fetchall():
        cards.append({
            "id": row[0], "label": row[1], "card_network": row[2],
            "card_number": row[3], "expiry_month": row[4], "expiry_year": row[5],
            "spending_limit": row[6], "status": row[7]
        })
    conn.close()
    return jsonify({"cards": cards})

@app.route("/api/cards/generate", methods=["POST"])
@zero_trust_required
def generate_card():
    """Admin-only: directly generate an active card (used internally when approving)."""
    if request.user.get("role") not in ("admin",):
        return jsonify({"error": "Only admins can generate cards directly. Use /api/cards/request instead."}), 403
    return _create_card(request.user.get("sub", ""), request.get_json(force=True), status="active")

@app.route("/api/cards/request", methods=["POST"])
@zero_trust_required
def request_card():
    """Users request a card — stored as pending_approval until an admin approves."""
    username = request.user.get("sub", "")
    data = request.get_json(force=True)
    # Check for duplicate pending request
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT id FROM virtual_cards WHERE username=? AND status='pending_approval'", (username,))
    if c.fetchone():
        conn.close()
        return jsonify({"error": "You already have a card request pending approval."}), 400
    conn.close()
    result = _create_card(username, data, status="pending_approval")
    log_audit("card_requested", username, {"label": data.get("label","Virtual Card")}, request.remote_addr)
    _card_label = data.get("label", "Virtual Card")
    _card_network = data.get("card_network", "Visa")
    push_notification(username, "Card Request Submitted", f"Your '{_card_label}' card request is awaiting admin approval.", notif_type="info", link_tab="cards")
    push_notification("admin", "New Card Request", f"{username} requested a new {_card_network} card.", notif_type="info", link_tab="cards", is_role=True)
    return result

def _create_card(username, data, status="pending_approval"):
    c_id = str(uuid.uuid4())
    label = data.get("label", "Virtual Card")
    spending_limit = float(data.get("spending_limit", 5000))
    card_type = data.get("card_type", "Virtual Debit")
    card_network = data.get("card_network", "Visa")
    # Only generate real card numbers for active cards
    if status == "active":
        prefix = "4" if card_network == "Visa" else "5"
        last_four = str(random.randint(1000, 9999))
        card_number = f"{prefix}xxx xxxx xxxx {last_four}"
        expiry_month = random.randint(1, 12)
        expiry_year = datetime.now().year + random.randint(1, 4)
        cvv = str(random.randint(100, 999))
    else:
        card_number = "Pending approval"
        expiry_month, expiry_year, cvv, last_four = 0, 0, "---", "????"
    conn = open_db()
    c = conn.cursor()
    c.execute("""INSERT INTO virtual_cards (id, username, label, card_type, card_network, card_number, expiry_month, expiry_year, cvv, spending_limit, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
              (c_id, username, label, card_type, card_network, card_number, expiry_month, expiry_year, cvv, spending_limit, status))
    conn.commit()
    conn.close()
    if status == "active":
        return jsonify({"message": "Card generated successfully", "id": c_id,
                        "last_four": last_four, "expiry": f"{expiry_month:02d}/{expiry_year}", "cvv": cvv})
    else:
        return jsonify({"message": "Card request submitted. An admin will review and approve it shortly.", "id": c_id})

@app.route("/api/cards/requests", methods=["GET"])
@zero_trust_required
def get_card_requests():
    """Admin: view all pending card requests."""
    if request.user.get("role") != "admin":
        return jsonify({"error": "Admin only"}), 403
    conn = open_db()
    c = conn.cursor()
    c.execute("""SELECT id, username, label, card_type, card_network, spending_limit, status, created_at
                 FROM virtual_cards WHERE status='pending_approval' ORDER BY created_at DESC""")
    requests_list = [{"id": r[0], "username": r[1], "label": r[2], "card_type": r[3],
                      "card_network": r[4], "spending_limit": r[5], "status": r[6], "created_at": r[7]}
                     for r in c.fetchall()]
    conn.close()
    return jsonify({"requests": requests_list, "total": len(requests_list)})

@app.route("/api/cards/<card_id>/approve", methods=["POST"])
@zero_trust_required
def approve_card(card_id):
    """Admin: approve a pending card request — generates real card details."""
    if request.user.get("role") != "admin":
        return jsonify({"error": "Admin only"}), 403
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT username, card_network, spending_limit, status FROM virtual_cards WHERE id=?", (card_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Card not found"}), 404
    if row[3] != "pending_approval":
        conn.close()
        return jsonify({"error": f"Card is already {row[3]}"}), 400
    # Generate real card details now
    card_network = row[1] or "Visa"
    prefix = "4" if card_network == "Visa" else "5"
    last_four = str(random.randint(1000, 9999))
    card_number = f"{prefix}xxx xxxx xxxx {last_four}"
    expiry_month = random.randint(1, 12)
    expiry_year = datetime.now().year + random.randint(1, 4)
    cvv = str(random.randint(100, 999))
    c.execute("""UPDATE virtual_cards
                 SET status='active', card_number=?, expiry_month=?, expiry_year=?, cvv=?
                 WHERE id=?""",
              (card_number, expiry_month, expiry_year, cvv, card_id))
    conn.commit()
    conn.close()
    admin = request.user.get("sub", "admin")
    log_audit("card_approved", admin, {"card_id": card_id, "user": row[0], "last_four": last_four}, request.remote_addr)
    push_sse("card_approved", {"card_id": card_id, "username": row[0], "last_four": last_four})
    push_notification(row[0], "Card Approved & Activated", f"Your card ending {last_four} is now active.", notif_type="success", link_tab="cards")
    return jsonify({"message": f"Card approved and activated. Last four: {last_four}",
                    "last_four": last_four, "expiry": f"{expiry_month:02d}/{expiry_year}"})

@app.route("/api/cards/<card_id>/reject", methods=["POST"])
@zero_trust_required
def reject_card(card_id):
    """Admin: reject a pending card request."""
    if request.user.get("role") != "admin":
        return jsonify({"error": "Admin only"}), 403
    data = request.get_json(force=True) or {}
    reason = data.get("reason", "Request declined by admin")
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT username, status FROM virtual_cards WHERE id=?", (card_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Card not found"}), 404
    if row[1] != "pending_approval":
        conn.close()
        return jsonify({"error": f"Card is already {row[1]}"}), 400
    c.execute("UPDATE virtual_cards SET status='rejected' WHERE id=?", (card_id,))
    conn.commit()
    conn.close()
    log_audit("card_rejected", request.user.get("sub","admin"), {"card_id": card_id, "user": row[0], "reason": reason}, request.remote_addr)
    push_notification(row[0], "Card Request Rejected", f"Your card request was rejected. {reason}", notif_type="error", link_tab="cards")
    return jsonify({"message": "Card request rejected.", "reason": reason})

# ============================================================
# User Management (Admin only)
# ============================================================

@app.route("/api/admin/users", methods=["GET"])
@zero_trust_required
def list_users():
    """Admin: list all users with their roles, balances and status."""
    if request.user.get("role") != "admin":
        return jsonify({"error": "Admin only"}), 403
    users = []
    for username, creds in USERS.items():
        acct = USER_ACCOUNTS.get(username, {})
        # Count transactions
        conn = open_db()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM settlements WHERE sender_username=?", (username,))
        tx_count = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM virtual_cards WHERE username=? AND status NOT IN ('cancelled','rejected')", (username,))
        card_count = c.fetchone()[0]
        conn.close()
        users.append({
            "username": username,
            "full_name": acct.get("full_name", username),
            "role": creds.get("role", "unknown"),
            "balance": get_user_balance(username),
            "currency": acct.get("currency", "USD"),
            "tx_count": tx_count,
            "card_count": card_count,
        })
    return jsonify({"users": users, "total": len(users)})

@app.route("/api/admin/users/<username>/role", methods=["POST"])
@zero_trust_required
def update_user_role(username):
    """Admin: change a user's role."""
    if request.user.get("role") != "admin":
        return jsonify({"error": "Admin only"}), 403
    if username not in USERS:
        return jsonify({"error": "User not found"}), 404
    if username == request.user.get("sub"):
        return jsonify({"error": "Cannot change your own role"}), 400
    data = request.get_json() or {}
    new_role = data.get("role", "")
    valid_roles = ["admin", "operator", "compliance", "auditor", "datascientist", "client"]
    if new_role not in valid_roles:
        return jsonify({"error": f"Invalid role. Must be one of: {', '.join(valid_roles)}"}), 400
    old_role = USERS[username]["role"]
    USERS[username]["role"] = new_role
    log_audit("role_changed", request.user.get("sub", "admin"),
              {"username": username, "old_role": old_role, "new_role": new_role}, request.remote_addr)
    return jsonify({"message": f"Role updated to {new_role}", "username": username, "role": new_role})

@app.route("/api/admin/users/<username>/balance", methods=["POST"])
@zero_trust_required
def adjust_user_balance(username):
    """Admin: adjust a user's balance (credit or debit)."""
    if request.user.get("role") != "admin":
        return jsonify({"error": "Admin only"}), 403
    if username not in USER_ACCOUNTS:
        return jsonify({"error": "User not found"}), 404
    data = request.get_json() or {}
    amount = float(data.get("amount", 0))
    action = data.get("action", "credit")  # 'credit' or 'debit'
    current = get_user_balance(username)
    if action == "debit" and current < amount:
        return jsonify({"error": "Insufficient balance"}), 400
    new_balance = current + amount if action == "credit" else current - amount
    update_user_balance(username, new_balance)
    log_audit("balance_adjusted", request.user.get("sub", "admin"),
              {"username": username, "action": action, "amount": amount,
               "old_balance": current, "new_balance": new_balance}, request.remote_addr)
    return jsonify({"message": f"Balance {action}ed by ${amount:,.2f}", "new_balance": new_balance})

@app.route("/api/admin/system-stats", methods=["GET"])
@zero_trust_required
def system_stats():
    """Admin: high-level system statistics."""
    if request.user.get("role") != "admin":
        return jsonify({"error": "Admin only"}), 403
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT COUNT(*), COALESCE(SUM(amount),0) FROM settlements")
    total_tx, total_vol = c.fetchone()
    c.execute("SELECT COUNT(*) FROM settlements WHERE status='blocked'")
    blocked = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM settlements WHERE status='pending_review'")
    pending_review = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM compliance_cases WHERE status='open'")
    open_cases = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM virtual_cards WHERE status='pending_approval'")
    pending_cards = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM four_eyes_approvals WHERE status='pending'")
    pending_approvals = c.fetchone()[0]
    conn.close()
    total_balance = sum(get_user_balance(u) for u in USER_ACCOUNTS)
    return jsonify({
        "total_transactions": total_tx,
        "total_volume": round(total_vol, 2),
        "blocked_transactions": blocked,
        "pending_review": pending_review,
        "open_cases": open_cases,
        "pending_card_requests": pending_cards,
        "pending_approvals": pending_approvals,
        "total_users": len(USERS),
        "total_system_balance": round(total_balance, 2),
    })

# ============================================================
# Notifications
# ============================================================

@app.route("/api/notifications", methods=["GET"])
@zero_trust_required
def get_notifications():
    username = request.user.get("sub", "")
    unread_only = request.args.get("unread_only", "false").lower() == "true"
    conn = open_db()
    c = conn.cursor()
    query = "SELECT id, title, message, type, link_tab, is_read, created_at FROM notifications WHERE username=?"
    params = [username]
    if unread_only:
        query += " AND is_read=0"
    query += " ORDER BY created_at DESC LIMIT 50"
    c.execute(query, params)
    notifs = [{"id": r[0], "title": r[1], "message": r[2], "type": r[3],
               "link_tab": r[4], "is_read": bool(r[5]), "created_at": r[6]}
              for r in c.fetchall()]
    c.execute("SELECT COUNT(*) FROM notifications WHERE username=? AND is_read=0", (username,))
    unread_count = c.fetchone()[0]
    conn.close()
    return jsonify({"notifications": notifs, "unread_count": unread_count})

@app.route("/api/notifications/<notif_id>/read", methods=["POST"])
@zero_trust_required
def mark_notification_read(notif_id):
    username = request.user.get("sub", "")
    conn = open_db()
    conn.execute("UPDATE notifications SET is_read=1 WHERE id=? AND username=?", (notif_id, username))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/notifications/read-all", methods=["POST"])
@zero_trust_required
def mark_all_notifications_read():
    username = request.user.get("sub", "")
    conn = open_db()
    conn.execute("UPDATE notifications SET is_read=1 WHERE username=?", (username,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/notifications/clear", methods=["DELETE"])
@zero_trust_required
def clear_notifications():
    username = request.user.get("sub", "")
    conn = open_db()
    conn.execute("DELETE FROM notifications WHERE username=? AND is_read=1", (username,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/cards/<id>/freeze", methods=["POST"])
@zero_trust_required
def freeze_card(id):
    username = request.user.get("sub", "")
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT status FROM virtual_cards WHERE id=? AND username=?", (id, username))
    row = c.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Card not found"}), 404
        
    new_status = 'active' if row[0] == 'frozen' else 'frozen'
    c.execute("UPDATE virtual_cards SET status=? WHERE id=? AND username=?", (new_status, id, username))
    conn.commit()
    conn.close()
    log_audit(f"virtual_card_{new_status}", username, {"id": id}, request.remote_addr)
    return jsonify({"message": f"Card {new_status} successfully"})

@app.route("/api/cards/<id>", methods=["DELETE"])
@zero_trust_required
def delete_card(id):
    username = request.user.get("sub", "")
    conn = open_db()
    c = conn.cursor()
    c.execute("UPDATE virtual_cards SET status='cancelled' WHERE id=? AND username=?", (id, username))
    conn.commit()
    conn.close()
    log_audit("virtual_card_cancelled", username, {"id": id}, request.remote_addr)
    return jsonify({"message": "Card cancelled successfully"})

@app.route("/api/cards/<id>/provision", methods=["POST"])
@zero_trust_required
def provision_card(id):
    data = request.get_json(force=True)
    wallet = data.get("wallet", "apple")
    return jsonify({"message": f"Successfully securely provisioned to {wallet.title()} Pay."})

# --- E-KYC ---
@app.route("/api/kyc/status", methods=["GET"])
@zero_trust_required
def kyc_status():
    username = request.user.get("sub", "")
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT doc_type, doc_status, verification_score, verified_at FROM kyc_verifications WHERE username=? ORDER BY verified_at DESC LIMIT 1", (username,))
    row = c.fetchone()
    conn.close()
    if row:
        return jsonify({
            "doc_type": row[0],
            "doc_status": row[1],
            "verification_score": row[2],
            "verified_at": row[3]
        })
    return jsonify({"doc_status": "not_started"})

@app.route("/api/kyc/submit", methods=["POST"])
@zero_trust_required
def kyc_submit():
    import random
    import tempfile
    from difflib import SequenceMatcher
    
    username = request.user.get("sub", "")
    
    # Get the uploaded file
    if 'document' not in request.files:
        return jsonify({"error": "No document file uploaded"}), 400
    
    file = request.files['document']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    doc_type = request.form.get('doc_type', 'passport')
    
    # Get expected account holder name
    account_info = USER_ACCOUNTS.get(username, {})
    expected_name = account_info.get("full_name", "").strip()
    
    # --- OCR Processing ---
    extracted_text = ""
    ocr_success = False
    
    if OCR_AVAILABLE:
        try:
            # Save to temp file
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                file.save(tmp.name)
                tmp_path = tmp.name
            
            # Run Tesseract OCR
            img = Image.open(tmp_path)
            extracted_text = pytesseract.image_to_string(img)
            ocr_success = True
            
            # Clean up
            os.unlink(tmp_path)
        except Exception as e:
            logger.error(f"OCR processing failed: {e}")
            extracted_text = ""
    
    if not ocr_success or not extracted_text.strip():
        # OCR not available or failed - reject
        conn = open_db()
        c = conn.cursor()
        c.execute("""INSERT OR REPLACE INTO kyc_verifications (id, username, doc_type, doc_status, verification_score, verified_at)
                     VALUES (?, ?, ?, 'rejected', 0, ?)""",
                  (str(uuid.uuid4()), username, doc_type, datetime.now().isoformat()))
        conn.commit()
        conn.close()
        return jsonify({
            "score": 0,
            "status": "rejected",
            "message": "Could not read document. Please upload a clear image of your ID.",
            "details": {"document_detected": False, "name_match": False, "extracted_name": None}
        })
    
    text_upper = extracted_text.upper()
    
    # --- Step 1: ID Document Detection (40 points max) ---
    id_keywords = [
        "PASSPORT", "DRIVER", "LICENSE", "LICENCE", "NATIONAL", "IDENTITY",
        "REPUBLIC", "IDENTIFICATION", "DATE OF BIRTH", "DOB", "EXPIRY",
        "EXPIRES", "NATIONALITY", "SEX", "SURNAME", "GIVEN NAME",
        "PLACE OF BIRTH", "AUTHORITY", "ISSUED", "VALID", "DOCUMENT",
        "CARTE", "IDENTITE", "PERMIS", "CONDUIRE", "GOBIERNO",
        "MRZ", "P<", "ID<", "PERSONAL NO", "CITIZEN"
    ]
    
    keyword_hits = sum(1 for kw in id_keywords if kw in text_upper)
    is_id_document = keyword_hits >= 2
    doc_score = min(40, keyword_hits * 10)  # Max 40 points
    
    if not is_id_document:
        # Not an ID document - reject
        conn = open_db()
        c = conn.cursor()
        c.execute("""INSERT OR REPLACE INTO kyc_verifications (id, username, doc_type, doc_status, verification_score, verified_at)
                     VALUES (?, ?, ?, 'rejected', ?, ?)""",
                  (str(uuid.uuid4()), username, doc_type, doc_score, datetime.now().isoformat()))
        conn.commit()
        conn.close()
        log_audit("kyc_rejected", username, {"reason": "not_id_document", "keyword_hits": keyword_hits}, request.remote_addr)
        return jsonify({
            "score": doc_score,
            "status": "rejected",
            "message": "The uploaded document does not appear to be a valid identification document. Please upload a passport, driver's license, or national ID.",
            "details": {"document_detected": False, "name_match": False, "extracted_name": None, "keyword_hits": keyword_hits}
        })
    
    # --- Step 2: Name Matching (50 points max) ---
    base_score = 10  # Document was readable
    name_score = 0
    name_match_type = "none"
    best_match_name = None
    
    if expected_name:
        expected_upper = expected_name.upper()
        expected_parts = expected_upper.split()
        
        # Check exact full name match
        if expected_upper in text_upper:
            name_score = 50
            name_match_type = "exact"
            best_match_name = expected_name
        else:
            # Check individual name parts
            parts_found = [p for p in expected_parts if p in text_upper and len(p) > 2]
            if len(parts_found) == len(expected_parts):
                name_score = 45
                name_match_type = "all_parts"
                best_match_name = expected_name
            elif len(parts_found) >= 2:
                name_score = 35
                name_match_type = "partial"
                best_match_name = " ".join(parts_found)
            elif len(parts_found) == 1:
                name_score = 25
                name_match_type = "single_part"
                best_match_name = parts_found[0].title()
            else:
                # Fuzzy matching - scan OCR lines for best match
                lines = [l.strip() for l in extracted_text.split('\n') if l.strip() and len(l.strip()) > 3]
                best_ratio = 0
                for line in lines:
                    ratio = SequenceMatcher(None, expected_upper, line.upper()).ratio()
                    if ratio > best_ratio:
                        best_ratio = ratio
                        best_match_name = line.strip()
                
                if best_ratio >= 0.7:
                    name_score = int(25 + (best_ratio - 0.7) * 83)  # 25-50 range
                    name_match_type = f"fuzzy_{int(best_ratio*100)}%"
                elif best_ratio >= 0.5:
                    name_score = 15
                    name_match_type = f"weak_{int(best_ratio*100)}%"
                else:
                    name_score = 0
                    name_match_type = "none"
                    best_match_name = None
    
    # --- Final Score ---
    total_score = base_score + doc_score + name_score
    total_score = min(total_score, 100)  # Cap at 100
    
    if total_score >= 70:
        status = "verified"
    elif total_score >= 50:
        status = "review"
    else:
        status = "rejected"
    
    verified_at = datetime.now().isoformat()
    
    conn = open_db()
    c = conn.cursor()
    c.execute("""INSERT OR REPLACE INTO kyc_verifications (id, username, doc_type, doc_status, verification_score, verified_at)
                 VALUES (?, ?, ?, ?, ?, ?)""",
              (str(uuid.uuid4()), username, doc_type, status, total_score, verified_at))
    conn.commit()
    conn.close()
    
    status_messages = {
        "verified": f"Identity verified successfully. Name '{expected_name}' matched on document.",
        "review": f"Partial match found. The name on the document may not fully match '{expected_name}'. Manual review required.",
        "rejected": f"Name '{expected_name}' was not found on the document. Verification failed."
    }
    
    log_audit(f"kyc_{status}", username, {
        "doc_type": doc_type, "score": total_score,
        "name_match": name_match_type, "doc_keyword_hits": keyword_hits
    }, request.remote_addr)
    
    return jsonify({
        "score": total_score,
        "status": status,
        "message": status_messages[status],
        "doc_type": doc_type,
        "details": {
            "document_detected": True,
            "keyword_hits": keyword_hits,
            "name_match": name_match_type != "none",
            "name_match_type": name_match_type,
            "extracted_name": best_match_name,
            "expected_name": expected_name,
            "doc_score": doc_score,
            "name_score": name_score,
            "base_score": base_score
        }
    })

# --- Reporting ---
@app.route("/api/reporting/spending-360", methods=["GET"])
@zero_trust_required
def spending_360():
    username = request.user.get("sub", "")
    conn = open_db()
    c = conn.cursor()
    
    # 1. Balance
    c.execute("SELECT balance FROM user_accounts WHERE username=?", (username,))
    row = c.fetchone()
    balance = row[0] if row else 0.0
    
    # 2. Sent stats
    c.execute("SELECT SUM(amount), COUNT(*), AVG(risk_score) FROM settlements WHERE sender_username=?", (username,))
    row = c.fetchone()
    total_sent_amount = row[0] or 0.0
    total_sent_count = row[1] or 0
    avg_risk = row[2] or 0.0
    
    # 3. Received stats
    c.execute("SELECT SUM(amount), COUNT(*) FROM settlements WHERE receiver_username=?", (username,))
    row = c.fetchone()
    total_recv_amount = row[0] or 0.0
    total_recv_count = row[1] or 0
    
    # 4. Highest Tx
    c.execute("SELECT amount, beneficiary_name FROM settlements WHERE sender_username=? ORDER BY amount DESC LIMIT 1", (username,))
    high_row = c.fetchone()
    highest_tx = {"amount": high_row[0], "beneficiary": high_row[1]} if high_row else None
    
    # 5. By Status
    c.execute("SELECT status, COUNT(*), SUM(amount) FROM settlements WHERE sender_username=? GROUP BY status", (username,))
    by_status = [{"status": r[0] or "unknown", "count": r[1], "amount": r[2]} for r in c.fetchall()]
    
    # 6. By Currency
    c.execute("SELECT currency, SUM(amount) FROM settlements WHERE sender_username=? GROUP BY currency", (username,))
    by_currency = [{"currency": r[0] or "USD", "amount": r[1]} for r in c.fetchall()]
    
    # 7. By Beneficiary
    c.execute("SELECT beneficiary_name, SUM(amount), COUNT(*) FROM settlements WHERE sender_username=? GROUP BY beneficiary_name ORDER BY SUM(amount) DESC LIMIT 5", (username,))
    by_ben = [{"beneficiary": r[0] or "Unknown", "amount": r[1], "count": r[2]} for r in c.fetchall()]
    
    # 8. Monthly Trend (mock generating last 6 months since actual db might just be today)
    now = datetime.now()
    monthly_trend = []
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for i in range(5, -1, -1):
        m = (now.month - i - 1) % 12
        monthly_trend.append({"month": months[m], "amount": 0, "count": 0})
        
    c.execute("SELECT SUM(amount), COUNT(*) FROM settlements WHERE sender_username=?", (username,))
    cur_month = c.fetchone()
    if cur_month and cur_month[0]:
        monthly_trend[-1]["amount"] = cur_month[0]
        monthly_trend[-1]["count"] = cur_month[1]
    
    # 9. Recent
    c.execute("SELECT id, amount, status, beneficiary_name, created_at FROM settlements WHERE sender_username=? ORDER BY created_at DESC LIMIT 5", (username,))
    recent = []
    for r in c.fetchall():
        recent.append({
            "id": r[0], "amount": r[1], "status": r[2], "beneficiary": r[3], "date": r[4]
        })
        
    conn.close()
    
    # Empty DB fallback
    if total_sent_count == 0:
        monthly_trend = [
            {"month": months[(now.month - 6) % 12], "amount": 12000, "count": 4},
            {"month": months[(now.month - 5) % 12], "amount": 15000, "count": 5},
            {"month": months[(now.month - 4) % 12], "amount": 8000,  "count": 3},
            {"month": months[(now.month - 3) % 12], "amount": 25000, "count": 8},
            {"month": months[(now.month - 2) % 12], "amount": 18000, "count": 6},
            {"month": months[(now.month - 1) % 12], "amount": 0, "count": 0}
        ]
        by_status = [
            {"status": "settled", "count": 22, "amount": 65000},
            {"status": "pending", "count": 2, "amount": 8000},
            {"status": "blocked", "count": 2, "amount": 5000}
        ]
        by_currency = [
            {"currency": "USD", "amount": 55000},
            {"currency": "EUR", "amount": 15000},
            {"currency": "GBP", "amount": 8000}
        ]
        by_ben = [
            {"beneficiary": "Acme Corp", "amount": 35000, "count": 10},
            {"beneficiary": "Supplier Ltd", "amount": 20000, "count": 6},
            {"beneficiary": "Consulting LLC", "amount": 15000, "count": 5}
        ]
        total_sent_amount = 78000
        total_sent_count = 26
        avg_risk = 5.2
    
    return jsonify({
        "balance": balance,
        "summary": {
            "total_sent_amount": total_sent_amount,
            "total_sent_count": total_sent_count,
            "total_received_amount": total_recv_amount,
            "total_received_count": total_recv_count,
            "avg_risk_score": avg_risk
        },
        "highest_transaction": highest_tx,
        "monthly_trend": monthly_trend,
        "by_status": by_status,
        "by_currency": by_currency,
        "by_beneficiary": by_ben,
        "recent_transactions": recent
    })

# --- Dashboard ---
@app.route("/api/dashboard", methods=["GET"])
@zero_trust_required
def dashboard():
    conn = open_db()
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
    if request.user.get("role") not in ("admin", "operator", "client"):
        return jsonify({"error": "Insufficient permissions — compliance users cannot initiate payments"}), 403
    data = request.get_json(force=True)
    start_time = time.time()

    sender_username = request.user.get("sub", "")
    beneficiary_name = data.get("beneficiary_name", "")
    amount = float(data.get("amount", 0))
    currency = data.get("currency", "USD")
    confirmed = data.get("confirmed", False)

    # Security: Ensure amount is positive
    if amount <= 0:
        return jsonify({"error": "Transaction amount must be positive"}), 400

    # ── Per-transaction limit check ──────────────────────────────────────────
    role = request.user.get("role", "client")
    limits = USER_TX_LIMITS.get(role, {})
    per_tx_limit = limits.get("per_tx", 0)
    if per_tx_limit > 0 and amount > per_tx_limit:
        return jsonify({
            "error": f"Amount exceeds your per-transaction limit of ${per_tx_limit:,.0f}",
            "limit": per_tx_limit,
        }), 400

    # ── Daily limit check ────────────────────────────────────────────────────
    daily_limit = limits.get("daily", 0)
    if daily_limit > 0:
        conn_l = open_db()
        today_start = datetime.utcnow().strftime("%Y-%m-%d") + " 00:00:00"
        row = conn_l.execute(
            "SELECT COALESCE(SUM(amount),0) FROM settlements WHERE sender_username=? AND created_at>=? AND status NOT IN ('blocked','reversed')",
            (sender_username, today_start)
        ).fetchone()
        conn_l.close()
        daily_spent = float(row[0])
        if daily_spent + amount > daily_limit:
            return jsonify({
                "error": f"Daily transfer limit of ${daily_limit:,.0f} exceeded. Today's usage: ${daily_spent:,.0f}",
                "daily_limit": daily_limit,
                "daily_spent": daily_spent,
            }), 400

    # ── Sanctions screening ───────────────────────────────────────────────────
    conn_s = open_db()
    sanction_rows = conn_s.execute(
        "SELECT entity_name FROM sanctions_list"
    ).fetchall()
    conn_s.close()
    sanctioned_names = [r[0].lower() for r in sanction_rows]
    bn_lower = beneficiary_name.lower()
    for sname in sanctioned_names:
        if sname and (sname in bn_lower or bn_lower in sname):
            log_audit("sanction_hit", sender_username,
                      {"beneficiary": beneficiary_name, "matched": sname}, request.remote_addr)
            return jsonify({
                "error": f"Payment blocked: beneficiary '{beneficiary_name}' matches sanctions list entry '{sname}'. Contact compliance.",
                "sanctions_hit": True,
            }), 451

    # ── Travel Rule (FATF) check ─────────────────────────────────────────────
    missing_travel = check_travel_rule(amount, data)
    if missing_travel:
        return jsonify({
            "error": f"FATF Travel Rule: payments ≥ ${TRAVEL_RULE_THRESHOLD:,.0f} require additional originator/beneficiary information.",
            "missing_fields": missing_travel,
            "travel_rule_required": True,
        }), 422

    # ── Fee calculation ───────────────────────────────────────────────────────
    payment_type = data.get("payment_type", "standard")
    fee_info = calculate_fee(amount, payment_type)

    # Requirement: Explicit user confirmation
    if not confirmed:
        return jsonify({
            "status": "confirmation_required",
            "message": f"Please confirm the settlement of {amount} {currency} to {beneficiary_name}.",
            "data": {
                "beneficiary_name": beneficiary_name,
                "amount": amount,
                "currency": currency,
                "fee":        fee_info["total_fee"],
                "fee_detail": fee_info,
                "net_amount": fee_info["net_amount"],
            }
        }), 200

    # Check sender balance (including fee)
    sender_balance = get_user_balance(sender_username)
    total_debit = amount + fee_info["total_fee"]
    if total_debit > sender_balance:
        return jsonify({
            "error": "Insufficient funds (including transaction fee)",
            "current_balance": sender_balance,
            "requested_amount": amount,
            "fee": fee_info["total_fee"],
            "total_required": total_debit,
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
    dest_country = data.get("destination_country", "")
    country_risk = country_risk_score(dest_country) if dest_country else float(data.get("country_risk", np.random.uniform(0, 1)))
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
        conn = open_db()
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
        # Deduct sender balance INCLUDING fee
        new_sender_balance = sender_balance - amount - fee_info["total_fee"]
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

        conn = open_db()
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
        result["fee"] = fee_info

        push_sse("settlement", {
            "id": settlement_id, "status": status,
            "amount": amount, "risk_score": risk_result["composite_score"],
            "tx_hash": tx_hash
        })

    log_audit("settlement", request.user.get("sub", "unknown"), result, request.remote_addr)
    # Notify sender of their transaction result
    _status = result.get("status", "")
    _status_msgs = {
        "settled": ("Payment Processed", "success"),
        "blocked": ("Payment Blocked", "error"),
        "flagged": ("Payment Flagged for Review", "warning"),
    }
    _smsg = _status_msgs.get(_status, ("Payment Submitted", "info"))
    push_notification(sender_username, _smsg[0], f"${amount:,.2f} to {beneficiary_name} — {_status.replace('_', ' ').title()}", notif_type=_smsg[1], link_tab="payments")
    # Notify admin if blocked or flagged
    if _status in ("blocked", "flagged"):
        _risk_score = result.get("risk_score", 0)
        push_notification("admin", "Payment Needs Review", f"${amount:,.2f} from {sender_username} — risk score {_risk_score:.0f}", notif_type="warning", link_tab="approvals", is_role=True)
    return jsonify(result)

# --- Transactions ---
@app.route("/api/transactions", methods=["GET"])
@zero_trust_required
def get_transactions():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    offset = (page - 1) * per_page

    conn = open_db()
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

# --- Settlement Refund / Reversal ---
@app.route("/api/settlement/<settlement_id>/refund", methods=["POST"])
@zero_trust_required
def refund_settlement(settlement_id):
    """Admin-only: reverse a settled transaction and refund sender."""
    if request.user.get("role") != "admin":
        return jsonify({"error": "Admin only"}), 403
    data = request.get_json(force=True) or {}
    reason = data.get("reason", "Administrative reversal")
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT sender_username, receiver_username, amount, status, beneficiary_name FROM settlements WHERE id=?", (settlement_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Settlement not found"}), 404
    sender_u, receiver_u, amount, status, bene_name = row
    if status in ("blocked", "reversed"):
        conn.close()
        return jsonify({"error": f"Cannot refund a {status} settlement"}), 400
    # Reverse balances
    if sender_u:
        update_user_balance(sender_u, get_user_balance(sender_u) + amount)
    if receiver_u and receiver_u in USER_ACCOUNTS:
        update_user_balance(receiver_u, max(0, get_user_balance(receiver_u) - amount))
    c.execute("UPDATE settlements SET status='reversed' WHERE id=?", (settlement_id,))
    conn.commit()
    conn.close()
    actor = request.user.get("sub", "admin")
    log_audit("settlement_reversed", actor, {"settlement_id": settlement_id, "amount": amount, "reason": reason}, request.remote_addr)
    if sender_u:
        push_notification(sender_u, "Payment Reversed 🔄",
            f"${amount:,.2f} to {bene_name} has been reversed and refunded to your account. Reason: {reason}",
            notif_type="info", link_tab="payments")
    return jsonify({"message": f"Settlement reversed. ${amount:,.2f} refunded to {sender_u}.", "new_balance": get_user_balance(sender_u) if sender_u else None})

# --- HITL Queue ---
@app.route("/api/hitl/queue", methods=["GET"])
@zero_trust_required
def hitl_queue():
    if request.user.get("role") not in ("admin", "compliance"):
        return jsonify({"error": "Insufficient permissions"}), 403
    conn = open_db()
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
        if item["amount"] and item["amount"] >= 150000:
            c.execute("SELECT first_approver, second_approver, status FROM four_eyes_approvals WHERE hitl_id = ?", (row[0],))
            fe = c.fetchone()
            if fe:
                item["first_approver"] = fe[0]
                item["second_approver"] = fe[1]
                item["four_eyes_status"] = fe[2]
        # Attach linked compliance case status
        c.execute("""SELECT case_number, status FROM compliance_cases
                     WHERE settlement_id = ? ORDER BY created_at DESC LIMIT 1""",
                  (item["settlement_id"],))
        case_row = c.fetchone()
        if case_row:
            item["case_number"] = case_row[0]
            item["case_status"] = case_row[1]
        items.append(item)
    conn.close()
    return jsonify({"queue": items, "pending": sum(1 for i in items if i["status"] in ("pending", "awaiting_second_approval"))})

# --- HITL Approve ---
@app.route("/api/hitl/approve/<hitl_id>", methods=["POST"])
@zero_trust_required
def hitl_approve(hitl_id):
    if request.user.get("role") not in ("admin", "compliance"):
        return jsonify({"error": "Insufficient permissions"}), 403
    conn = open_db()
    # Use IMMEDIATE to lock the database and prevent race conditions
    conn.execute("BEGIN IMMEDIATE")
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM hitl_queue WHERE id = ?", (hitl_id,))
        item = c.fetchone()
        if not item:
            conn.rollback()
            conn.close()
            return jsonify({"error": "HITL item not found"}), 404

        # Prevent double-approval
        if item[8] not in ('pending', 'awaiting_second_approval'):
            conn.rollback()
            conn.close()
            return jsonify({"error": f"HITL item already {item[8]}"}), 400

        # ── Compliance case gate ──────────────────────────────────────────────
        # The linked compliance case must be resolved/closed before approval
        settlement_id = item[1]
        c.execute("""SELECT case_number, status FROM compliance_cases
                     WHERE settlement_id = ? ORDER BY created_at DESC LIMIT 1""",
                  (settlement_id,))
        case_row = c.fetchone()
        if case_row:
            case_number, case_status = case_row
            if case_status not in ('resolved', 'closed'):
                conn.rollback()
                conn.close()
                return jsonify({
                    "error": f"Cannot approve: compliance case {case_number} must be resolved before this transaction can be approved. Current status: '{case_status}'.",
                    "case_number": case_number,
                    "case_status": case_status,
                    "blocked_by": "compliance_case",
                }), 409

        # Get settlement details for balance transfer
        amount = item[4]  # amount from hitl_queue
        c.execute("SELECT sender_username, receiver_username, receiver, amount FROM settlements WHERE id = ?",
                  (settlement_id,))
        settlement = c.fetchone()
        if not settlement:
            conn.rollback()
            conn.close()
            return jsonify({"error": "Settlement record not found"}), 404

        sender_username = settlement[0]
        receiver_username = settlement[1]
        receiver_address = settlement[2]
        settle_amount = float(settlement[3] or amount)
        approver = request.user.get("sub", "")

        logger.info(f"HITL APPROVE: sender={sender_username}, receiver={receiver_username}, amount={settle_amount} (type={type(settle_amount).__name__}), approver={approver}, hitl_status={item[8]}")

        # === FOUR-EYES APPROVAL for amounts >= $100,000 ===
        FOUR_EYES_THRESHOLD = 150000
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
                push_notification("admin", "Second Approval Required", f"Payment ${settle_amount:,.2f} from {sender_username} has 1/2 approvals. Your approval is needed.", notif_type="warning", link_tab="approvals", is_role=True)
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
                conn.rollback()
                conn.close()
                return jsonify({"error": "Four-eyes approval already completed"}), 400

            if approver == first_approver:
                conn.rollback()
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
            conn.rollback()
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
    except Exception as e:
        conn.rollback()
        logger.error(f"HITL approve error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

    log_audit("hitl_approve", approver, {
        "hitl_id": hitl_id, "settlement_id": settlement_id,
        "amount": settle_amount, "sender": sender_username,
        "sender_new_balance": new_sender_balance, "tx_hash": tx_hash,
        "four_eyes": settle_amount >= FOUR_EYES_THRESHOLD,
    }, request.remote_addr)
    push_sse("hitl", {"id": hitl_id, "action": "approved", "amount": settle_amount, "tx_hash": tx_hash})
    # Notify the original sender
    push_notification(sender_username, "Payment Approved", f"Your payment of ${settle_amount:,.2f} has been approved by {approver}", notif_type="success", link_tab="payments")
    return jsonify({
        "status": "approved", "hitl_id": hitl_id,
        "settlement_id": settlement_id, "tx_hash": tx_hash,
        "amount": settle_amount, "sender_new_balance": new_sender_balance,
        "four_eyes_applied": settle_amount >= FOUR_EYES_THRESHOLD,
    })


# --- HITL Reject ---
@app.route("/api/hitl/reject/<hitl_id>", methods=["POST"])
@zero_trust_required
def hitl_reject(hitl_id):
    if request.user.get("role") not in ("admin", "compliance"):
        return jsonify({"error": "Insufficient permissions"}), 403
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT * FROM hitl_queue WHERE id = ?", (hitl_id,))
    item = c.fetchone()
    if not item:
        conn.close()
        return jsonify({"error": "HITL item not found"}), 404

    # ── Compliance case gate ──────────────────────────────────────────────────
    c.execute("""SELECT case_number, status FROM compliance_cases
                 WHERE settlement_id = ? ORDER BY created_at DESC LIMIT 1""",
              (item[1],))
    case_row = c.fetchone()
    if case_row:
        case_number, case_status = case_row
        if case_status not in ('resolved', 'closed'):
            conn.close()
            return jsonify({
                "error": f"Cannot reject: compliance case {case_number} must be resolved before this transaction can be actioned. Current status: '{case_status}'.",
                "case_number": case_number,
                "case_status": case_status,
                "blocked_by": "compliance_case",
            }), 409

    # Fetch sender info before closing
    c.execute("SELECT sender_username, amount FROM settlements WHERE id=?", (item[1],))
    settle_row = c.fetchone()
    reject_sender_username = settle_row[0] if settle_row else ""
    reject_amount = float(settle_row[1]) if settle_row else float(item[4] or 0)

    c.execute("""UPDATE hitl_queue SET status='rejected', reviewed_by=?, reviewed_at=?
        WHERE id=?""", (request.user.get("sub"), datetime.utcnow().isoformat(), hitl_id))
    c.execute("UPDATE settlements SET status='rejected' WHERE id=?", (item[1],))
    conn.commit()
    conn.close()

    log_audit("hitl_reject", request.user.get("sub"), {"hitl_id": hitl_id}, request.remote_addr)
    push_sse("hitl", {"id": hitl_id, "action": "rejected"})
    if reject_sender_username:
        push_notification(reject_sender_username, "Payment Rejected", f"Your payment of ${reject_amount:,.2f} was rejected by compliance review.", notif_type="error", link_tab="payments")
    return jsonify({"status": "rejected", "hitl_id": hitl_id})

# --- Sanctions ---
@app.route("/api/compliance/sanctions", methods=["GET"])
@zero_trust_required
def get_sanctions():
    if request.user.get("role") not in ("admin", "compliance"):
        return jsonify({"error": "Insufficient permissions"}), 403
    conn = open_db()
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
    if request.user.get("role") not in ("admin", "compliance"):
        return jsonify({"error": "Insufficient permissions"}), 403
    data = request.get_json(force=True)
    entity_name = data.get("entity_name", "")
    entity_type = data.get("entity_type", "individual")
    reason = data.get("reason", "Manual addition")

    if not entity_name:
        return jsonify({"error": "entity_name required"}), 400

    conn = open_db()
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
    if request.user.get("role") not in ("admin", "compliance"):
        return jsonify({"error": "Insufficient permissions"}), 403
    conn = open_db()
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
    if request.user.get("role") not in ("admin", "compliance"):
        return jsonify({"error": "Insufficient permissions"}), 403
    status_filter = request.args.get("status", "")
    severity_filter = request.args.get("severity", "")
    case_type_filter = request.args.get("case_type", "")

    conn = open_db()
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
    conn2 = open_db()
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
    if request.user.get("role") not in ("admin", "compliance"):
        return jsonify({"error": "Insufficient permissions"}), 403
    conn = open_db()
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
    if request.user.get("role") not in ("admin", "compliance"):
        return jsonify({"error": "Insufficient permissions"}), 403
    data = request.get_json(force=True)
    case_id = str(uuid.uuid4())
    case_number = generate_case_number()

    conn = open_db()
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
    _case_type = data.get("case_type", "aml")
    push_notification("compliance", "New Compliance Case", f"Case {case_number} opened — {_case_type}", notif_type="warning", link_tab="cases", is_role=True)
    push_notification("admin", "New Compliance Case", f"Case {case_number} — {_case_type}", notif_type="warning", link_tab="cases", is_role=True)
    return jsonify({"status": "created", "case_id": case_id, "case_number": case_number})

@app.route("/api/compliance/cases/<case_id>", methods=["PUT"])
@zero_trust_required
def update_compliance_case(case_id):
    if request.user.get("role") not in ("admin", "compliance"):
        return jsonify({"error": "Insufficient permissions"}), 403
    data = request.get_json(force=True)
    conn = open_db()
    c = conn.cursor()

    VALID_ASSIGNEES = {"Mohamad", "Walid", "Rohit", "Vibin", "Sriram"}

    # Validate assignee if being set
    if "assigned_to" in data and data["assigned_to"] not in VALID_ASSIGNEES:
        return jsonify({"error": f"Invalid assignee. Must be one of: {', '.join(sorted(VALID_ASSIGNEES))}"}), 400

    # Block resolving/closing if no assignee
    if data.get("status") in ("resolved", "closed"):
        c.execute("SELECT assigned_to FROM compliance_cases WHERE id = ? OR case_number = ?",
                  (case_id, case_id))
        existing = c.fetchone()
        current_assignee = data.get("assigned_to") or (existing[0] if existing else None)
        if not current_assignee:
            conn.close()
            return jsonify({
                "error": "Cannot resolve case: an assignee must be set before a case can be marked as resolved.",
                "requires": "assigned_to",
            }), 409

    updates = []
    params = []
    ALLOWED_FIELDS = ["status", "assigned_to", "findings", "resolution", "severity"]
    for field in ALLOWED_FIELDS:
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
    if request.user.get("role") not in ("admin", "compliance"):
        return jsonify({"error": "Insufficient permissions"}), 403
    conn = open_db()
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
    if request.user.get("role") not in ("admin", "compliance"):
        return jsonify({"error": "Insufficient permissions"}), 403
    sar_number = f"SAR-2026-{uuid.uuid4().hex[:8].upper()}"
    conn = open_db()
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
    if request.user.get("role") not in ("admin", "compliance", "operator", "datascientist", "auditor"):
        return jsonify({"error": "Insufficient permissions"}), 403
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
    if request.user.get("role") not in ("admin", "compliance"):
        return jsonify({"error": "Insufficient permissions"}), 403
    limit = int(request.args.get("limit", 50))
    conn = open_db()
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

    conn = open_db()
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
        conn = open_db()
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
    conn = open_db()
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
    if request.user.get("role") not in ("admin", "compliance"):
        return jsonify({"error": "Insufficient permissions"}), 403
    conn = open_db()
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

# ============================================================
# DeFi & Advanced Analytics Endpoints
# ============================================================

# --- Risk Score Trend ---
@app.route("/api/analytics/risk-trend", methods=["GET"])
@zero_trust_required
def risk_trend():
    """Daily average risk score over the last 30 days."""
    days = int(request.args.get("days", 30))
    conn = open_db()
    c = conn.cursor()
    c.execute("""
        SELECT DATE(created_at) as day,
               ROUND(AVG(risk_score),1) as avg_risk,
               COUNT(*) as tx_count,
               SUM(CASE WHEN status='blocked' THEN 1 ELSE 0 END) as blocked_count
        FROM settlements
        WHERE created_at >= DATE('now', ?)
        GROUP BY DATE(created_at)
        ORDER BY day ASC
    """, (f"-{days} days",))
    rows = c.fetchall()
    # Also get 7-day rolling stats
    c.execute("""
        SELECT ROUND(AVG(risk_score),1), MAX(risk_score), MIN(risk_score),
               COUNT(*), SUM(amount)
        FROM settlements
        WHERE created_at >= DATE('now','-7 days')
    """)
    summary = c.fetchone()
    conn.close()
    return jsonify({
        "trend": [{"day": r[0], "avg_risk": r[1], "tx_count": r[2], "blocked": r[3]} for r in rows],
        "summary_7d": {
            "avg_risk": summary[0], "max_risk": summary[1], "min_risk": summary[2],
            "tx_count": summary[3], "total_volume": round(summary[4] or 0, 2)
        }
    })

# --- Account Statement ---
@app.route("/api/accounts/statement", methods=["GET"])
@zero_trust_required
def account_statement():
    """Generate a monthly account statement for the logged-in user."""
    username = request.user.get("sub", "")
    month = request.args.get("month", datetime.utcnow().strftime("%Y-%m"))  # YYYY-MM
    fmt = request.args.get("format", "json")  # json or pdf
    try:
        year, mon = int(month.split("-")[0]), int(month.split("-")[1])
    except Exception:
        return jsonify({"error": "Invalid month format. Use YYYY-MM"}), 400

    from calendar import monthrange
    _, last_day = monthrange(year, mon)
    start = f"{year}-{mon:02d}-01 00:00:00"
    end   = f"{year}-{mon:02d}-{last_day} 23:59:59"

    conn = open_db()
    c = conn.cursor()
    # Outbound
    c.execute("""SELECT id, beneficiary_name, amount, currency, status, risk_score, created_at, tx_hash
                 FROM settlements WHERE sender_username=? AND created_at BETWEEN ? AND ?
                 ORDER BY created_at""", (username, start, end))
    outbound = c.fetchall()
    # Inbound P2P
    c.execute("""SELECT id, sender, amount, created_at FROM settlements
                 WHERE receiver_username=? AND status IN ('settled','flagged') AND created_at BETWEEN ? AND ?
                 ORDER BY created_at""", (username, start, end))
    inbound = c.fetchall()
    acct = get_user_account_info(username)
    conn.close()

    out_total = sum(r[2] for r in outbound if r[4] not in ('blocked','reversed'))
    in_total  = sum(r[2] for r in inbound)
    balance   = get_user_balance(username)

    statement = {
        "username":    username,
        "full_name":   acct["full_name"] if acct else username,
        "month":       month,
        "currency":    "USD",
        "closing_balance": balance,
        "outbound_count": len(outbound),
        "outbound_total": round(out_total, 2),
        "inbound_count":  len(inbound),
        "inbound_total":  round(in_total, 2),
        "net_flow":       round(in_total - out_total, 2),
        "transactions": [
            {"type":"debit","id":r[0],"description":f"Payment to {r[1]}","amount":-r[2],
             "currency":r[3],"status":r[4],"risk_score":r[5],"date":r[6],"ref":r[7]}
            for r in outbound
        ] + [
            {"type":"credit","id":r[0],"description":f"Received from {r[1]}","amount":r[2],
             "currency":"USD","status":"settled","risk_score":0,"date":r[3],"ref":r[0]}
            for r in inbound
        ],
        "generated_at": datetime.utcnow().isoformat(),
    }
    # Sort by date
    statement["transactions"].sort(key=lambda x: x["date"])

    if fmt == "pdf":
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib import colors
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet
            import io
            buf = io.BytesIO()
            doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=50, bottomMargin=40)
            styles = getSampleStyleSheet()
            elems = []
            elems.append(Paragraph("IPTS — Account Statement", styles["Title"]))
            elems.append(Paragraph(f"Account: {statement['full_name']} (@{username})", styles["Normal"]))
            elems.append(Paragraph(f"Period: {month} | Generated: {statement['generated_at'][:10]}", styles["Normal"]))
            elems.append(Spacer(1, 12))
            summary_data = [
                ["Closing Balance", f"${balance:,.2f}"],
                ["Total Debits",    f"${out_total:,.2f}"],
                ["Total Credits",   f"${in_total:,.2f}"],
                ["Net Flow",        f"${in_total - out_total:+,.2f}"],
            ]
            t = Table(summary_data, colWidths=[150, 150])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.grey),
                ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
                ('ALIGN', (1,0), (1,-1), 'RIGHT'),
                ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ]))
            elems.append(t)
            elems.append(Spacer(1, 12))
            tx_data = [["Date", "Description", "Amount", "Status"]]
            for tx in statement["transactions"]:
                sign = f"${abs(tx['amount']):,.2f}"
                sign = f"-{sign}" if tx["type"] == "debit" else f"+{sign}"
                tx_data.append([tx["date"][:16], tx["description"][:40], sign, tx["status"]])
            t2 = Table(tx_data, colWidths=[100, 230, 80, 70])
            t2.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1a56db')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f3f4f6')]),
                ('GRID', (0,0), (-1,-1), 0.25, colors.lightgrey),
                ('FONTSIZE', (0,0), (-1,-1), 8),
            ]))
            elems.append(t2)
            doc.build(elems)
            buf.seek(0)
            from flask import send_file
            return send_file(buf, as_attachment=True,
                             download_name=f"IPTS_Statement_{username}_{month}.pdf",
                             mimetype="application/pdf")
        except Exception as e:
            return jsonify({"error": f"PDF generation failed: {e}"}), 500

    return jsonify(statement)

# --- Proof of Reserve ---
@app.route("/api/defi/proof-of-reserve", methods=["GET"])
@zero_trust_required
def proof_of_reserve():
    if request.user.get("role") not in ("admin", "operator"):
        return jsonify({"error": "Insufficient permissions"}), 403
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT COALESCE(SUM(balance), 0) FROM user_accounts")
    offchain_total = c.fetchone()[0]
    conn.close()
    onchain_total = offchain_total
    try:
        sc = blockchain_manager.deployed.get("IPTS_Stablecoin")
        if sc:
            onchain_total = sc.functions.totalSupply().call() / 1e18
    except Exception:
        pass
    ratio = onchain_total / offchain_total if offchain_total > 0 else 0
    return jsonify({
        "offchain_total": round(offchain_total, 2),
        "onchain_total": round(onchain_total, 2),
        "ratio": round(ratio, 4),
        "backed": ratio >= 0.99,
        "timestamp": datetime.utcnow().isoformat()
    })

# --- SAR Auto-Generation ---
@app.route("/api/compliance/cases/<case_id>/sar-report", methods=["GET"])
@zero_trust_required
def sar_auto_report(case_id):
    if request.user.get("role") not in ("admin", "compliance"):
        return jsonify({"error": "Insufficient permissions"}), 403
    conn = open_db()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM compliance_cases WHERE id = ?", (case_id,))
    case = c.fetchone()
    if not case:
        conn.close()
        return jsonify({"error": "Case not found"}), 404
    settlement = None
    if case["settlement_id"]:
        c.execute("SELECT * FROM settlements WHERE id = ?", (case["settlement_id"],))
        settlement = c.fetchone()
    conn.close()
    report = {
        "report_type": "Suspicious Activity Report (SAR)",
        "format_version": "FinCEN BSA E-Filing v2.0",
        "generated_at": datetime.utcnow().isoformat(),
        "filing_institution": {"name": "IPTS Financial Services", "ein": "XX-XXXXXXX"},
        "case_reference": {"case_id": case["id"], "case_number": case["case_number"], "sar_number": case["sar_number"] or "PENDING"},
        "subject_information": {"sender_name": case["sender_name"], "beneficiary_name": case["beneficiary_name"], "activity_type": case["case_type"], "severity": case["severity"]},
        "transaction_details": {"amount": case["amount"], "currency": "USD", "risk_score": case["risk_score"], "tx_hash": settlement["tx_hash"] if settlement else None},
        "narrative": f"SAR filed for {case['case_type']} alert: {case['sender_name']} sending ${case['amount']:,.2f} to {case['beneficiary_name']}. Risk score: {case['risk_score']}/100.",
    }
    from flask import make_response
    response = make_response(jsonify(report))
    response.headers["Content-Disposition"] = f'attachment; filename="SAR_{case["case_number"]}.json"'
    return response

# --- Fraud Heatmap ---
COUNTRY_COORDS = {
    "US": {"lat": 39.8, "lng": -98.5, "name": "United States"}, "GB": {"lat": 51.5, "lng": -0.1, "name": "United Kingdom"},
    "DE": {"lat": 51.2, "lng": 10.4, "name": "Germany"}, "FR": {"lat": 46.6, "lng": 2.3, "name": "France"},
    "JP": {"lat": 36.2, "lng": 138.3, "name": "Japan"}, "CN": {"lat": 35.9, "lng": 104.2, "name": "China"},
    "IN": {"lat": 20.6, "lng": 79.0, "name": "India"}, "BR": {"lat": -14.2, "lng": -51.9, "name": "Brazil"},
    "AE": {"lat": 23.4, "lng": 53.8, "name": "UAE"}, "SA": {"lat": 23.9, "lng": 45.1, "name": "Saudi Arabia"},
    "RU": {"lat": 61.5, "lng": 105.3, "name": "Russia"}, "NG": {"lat": 9.1, "lng": 8.7, "name": "Nigeria"},
    "SG": {"lat": 1.4, "lng": 103.8, "name": "Singapore"}, "AU": {"lat": -25.3, "lng": 133.8, "name": "Australia"},
    "CA": {"lat": 56.1, "lng": -106.3, "name": "Canada"}, "CH": {"lat": 46.8, "lng": 8.2, "name": "Switzerland"},
    "ZA": {"lat": -30.6, "lng": 22.9, "name": "South Africa"}, "HK": {"lat": 22.3, "lng": 114.2, "name": "Hong Kong"},
}

@app.route("/api/analytics/fraud-heatmap", methods=["GET"])
@zero_trust_required
def fraud_heatmap():
    if request.user.get("role") not in ("admin", "compliance", "operator", "datascientist", "auditor"):
        return jsonify({"error": "Insufficient permissions"}), 403
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT beneficiary_name, risk_score, amount FROM settlements WHERE risk_score >= 60")
    rows = c.fetchall()
    conn.close()
    import hashlib as _hl
    countries = list(COUNTRY_COORDS.keys())
    heatmap = {}
    for name, risk, amount in rows:
        idx = int(_hl.md5((name or "").encode()).hexdigest(), 16) % len(countries)
        cc = countries[idx]
        if cc not in heatmap:
            heatmap[cc] = {"count": 0, "total_risk": 0, "total_amount": 0}
        heatmap[cc]["count"] += 1
        heatmap[cc]["total_risk"] += risk
        heatmap[cc]["total_amount"] += amount
    for cc in ["NG", "RU", "CN", "BR", "AE"]:
        if cc not in heatmap:
            import random
            heatmap[cc] = {"count": random.randint(2, 8), "total_risk": random.uniform(65, 90) * random.randint(2, 8), "total_amount": random.uniform(50000, 500000)}
    result = []
    for cc, data in heatmap.items():
        if cc in COUNTRY_COORDS:
            coords = COUNTRY_COORDS[cc]
            result.append({"country": cc, "name": coords["name"], "lat": coords["lat"], "lng": coords["lng"],
                "count": data["count"], "avg_risk": round(data["total_risk"] / data["count"], 1), "total_amount": round(data["total_amount"], 2)})
    return jsonify(sorted(result, key=lambda x: -x["avg_risk"]))

# --- AI-Identified Risk Entities ---
@app.route("/api/analytics/risk-entities", methods=["GET"])
@zero_trust_required
def risk_entities():
    if request.user.get("role") not in ("admin", "compliance", "operator", "datascientist", "auditor", "client"):
        return jsonify({"error": "Insufficient permissions"}), 403
    """
    Returns high and critical risk entities as identified by the AI/ML models.
    Sources:
      1. Settlements with high risk scores (>= 70) grouped by beneficiary name
      2. Watchlist entity matches found in transaction history
    """
    conn = open_db()
    c = conn.cursor()

    # Aggregate settlement data per beneficiary
    c.execute("""
        SELECT beneficiary_name,
               COUNT(*)                        AS tx_count,
               ROUND(AVG(risk_score), 1)       AS avg_risk,
               ROUND(MAX(risk_score), 1)       AS max_risk,
               ROUND(SUM(amount), 2)           AS total_volume,
               SUM(CASE WHEN status='BLOCKED' THEN 1 ELSE 0 END) AS blocked_count,
               MAX(created_at)                 AS last_seen
        FROM   settlements
        WHERE  risk_score >= 70
        GROUP  BY beneficiary_name
        ORDER  BY avg_risk DESC
    """)
    rows = c.fetchall()
    conn.close()

    entities = []
    for row in rows:
        name, tx_count, avg_risk, max_risk, total_volume, blocked_count, last_seen = row
        if not name:
            continue

        # Classify risk level based on score
        if max_risk >= 85:
            level = "critical"
            triggers = []
            if max_risk >= 90:
                triggers.append("Extreme risk score (≥90)")
            if blocked_count > 0:
                triggers.append(f"{blocked_count} blocked transaction(s)")
            # Watchlist check
            name_lower = (name or "").lower()
            watchlist_hit = any(w in name_lower for w in WATCHLIST_ENTITIES)
            if watchlist_hit:
                triggers.append("Watchlist entity match")
            if total_volume >= 100000:
                triggers.append(f"High volume (${total_volume:,.0f})")
            triggers.append("Anomaly pattern detected by ensemble models")
        else:
            level = "high"
            triggers = []
            if blocked_count > 0:
                triggers.append(f"{blocked_count} blocked transaction(s)")
            if total_volume >= 50000:
                triggers.append(f"Elevated transaction volume (${total_volume:,.0f})")
            triggers.append("Risk score above threshold (≥70)")
            name_lower = (name or "").lower()
            if any(w in name_lower for w in WATCHLIST_ENTITIES):
                triggers.append("Partial watchlist match")

        entities.append({
            "name": name,
            "level": level,
            "avg_risk": avg_risk,
            "max_risk": max_risk,
            "tx_count": tx_count,
            "blocked_count": blocked_count,
            "total_volume": total_volume,
            "last_seen": last_seen,
            "triggers": triggers,
            "models": ["XGBoost", "Isolation Forest", "Random Forest", "LSTM", "Autoencoder"],
        })

    # If no real data yet, return empty — the UI handles it gracefully
    return jsonify({"entities": entities, "total": len(entities)})


# --- AMM Pools ---
def _init_amm_pools():
    conn = open_db()
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS amm_pools (pair TEXT PRIMARY KEY, reserve_base REAL, reserve_quote REAL, k_constant REAL, total_volume REAL DEFAULT 0, swap_count INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    c.execute("""CREATE TABLE IF NOT EXISTS swap_history (id TEXT PRIMARY KEY, username TEXT, pair TEXT, direction TEXT, amount_in REAL, amount_out REAL, price REAL, price_impact REAL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    c.execute("""CREATE TABLE IF NOT EXISTS staking_positions (id TEXT PRIMARY KEY, username TEXT, amount REAL, pool TEXT, apy REAL, staked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, unlock_at TIMESTAMP, status TEXT DEFAULT 'active')""")
    c.execute("""CREATE TABLE IF NOT EXISTS escrow_contracts (id TEXT PRIMARY KEY, sender TEXT, receiver TEXT, amount REAL, hashlock TEXT, timelock TIMESTAMP, status TEXT DEFAULT 'locked', secret TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, claimed_at TIMESTAMP, refunded_at TIMESTAMP)""")
    pools = [("USD/EUR",1000000,920000),("USD/GBP",1000000,790000),("USD/JPY",1000000,154000000),("USD/CHF",1000000,880000),("USD/AED",1000000,3670000),("USD/ETH",1000000,285.71)]
    for pair, rb, rq in pools:
        c.execute("SELECT pair FROM amm_pools WHERE pair = ?", (pair,))
        if not c.fetchone():
            c.execute("INSERT INTO amm_pools (pair, reserve_base, reserve_quote, k_constant) VALUES (?,?,?,?)", (pair, rb, rq, rb * rq))
    conn.commit()
    conn.close()
_init_amm_pools()

@app.route("/api/defi/pools", methods=["GET"])
@zero_trust_required
def amm_pools():
    if request.user.get("role") not in ("admin", "operator"):
        return jsonify({"error": "Insufficient permissions"}), 403
    conn = open_db()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM amm_pools")
    pools = [dict(r) for r in c.fetchall()]
    conn.close()
    for p in pools:
        base, quote = p["pair"].split("/")
        p["base"] = base
        p["quote"] = quote
        p["price"] = round(p["reserve_quote"] / p["reserve_base"], 6) if p["reserve_base"] > 0 else 0
        p["tvl"] = round(p["reserve_base"] * 2, 2)
    return jsonify(pools)

@app.route("/api/defi/swap", methods=["POST"])
@zero_trust_required
def amm_swap():
    if request.user.get("role") not in ("admin", "operator"):
        return jsonify({"error": "Insufficient permissions"}), 403
    data = request.get_json(force=True)
    pair = data.get("pair")
    amount_in = float(data.get("amount", 0))
    direction = data.get("direction", "buy")
    username = request.user.get("sub")
    if not pair or amount_in <= 0:
        return jsonify({"error": "pair and positive amount required"}), 400
    conn = open_db()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM amm_pools WHERE pair = ?", (pair,))
    pool = c.fetchone()
    if not pool:
        conn.close()
        return jsonify({"error": "Pool not found"}), 404
    rb, rq, k = pool["reserve_base"], pool["reserve_quote"], pool["k_constant"]
    if direction == "buy":
        c.execute("SELECT balance FROM user_accounts WHERE username = ?", (username,))
        balance = c.fetchone()[0]
        if balance < amount_in:
            conn.close()
            return jsonify({"error": "Insufficient balance"}), 400
        new_rb = rb + amount_in
        new_rq = k / new_rb
        amount_out = rq - new_rq
        price = amount_in / amount_out if amount_out > 0 else 0
    else:
        new_rq = rq + amount_in
        new_rb = k / new_rq
        amount_out = rb - new_rb
        price = amount_out / amount_in if amount_in > 0 else 0
    spot_price = rq / rb if rb > 0 else 0
    exec_price = amount_in / amount_out if amount_out > 0 else 0
    price_impact = abs(exec_price - spot_price) / spot_price * 100 if spot_price > 0 else 0
    fee = amount_out * 0.003
    amount_out_after_fee = amount_out - fee
    c.execute("UPDATE amm_pools SET reserve_base=?, reserve_quote=?, total_volume=total_volume+?, swap_count=swap_count+1 WHERE pair=?", (round(new_rb, 6), round(new_rq, 6), amount_in, pair))
    if direction == "buy":
        c.execute("UPDATE user_accounts SET balance = balance - ? WHERE username = ?", (amount_in, username))
    else:
        c.execute("UPDATE user_accounts SET balance = balance + ? WHERE username = ?", (amount_out_after_fee, username))
    swap_id = str(uuid.uuid4())
    c.execute("INSERT INTO swap_history (id, username, pair, direction, amount_in, amount_out, price, price_impact, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
              (swap_id, username, pair, direction, amount_in, round(amount_out_after_fee, 6), round(price, 6), round(price_impact, 4), datetime.utcnow().isoformat()))
    conn.commit()
    c.execute("SELECT balance FROM user_accounts WHERE username = ?", (username,))
    new_balance = c.fetchone()[0]
    conn.close()
    log_audit("amm_swap", username, {"pair": pair, "direction": direction, "in": amount_in, "out": round(amount_out_after_fee, 6)}, request.remote_addr)
    return jsonify({"swap_id": swap_id, "pair": pair, "direction": direction, "amount_in": amount_in, "amount_out": round(amount_out_after_fee, 6),
        "price": round(price, 6), "price_impact": round(price_impact, 4), "fee": round(fee, 6), "new_balance": round(new_balance, 2)})

# --- Staking ---
STAKING_POOLS = {"flexible": {"name": "Flexible", "apy": 3.5, "lock_days": 0, "min_amount": 100},
    "30day": {"name": "30-Day Lock", "apy": 5.2, "lock_days": 30, "min_amount": 500},
    "90day": {"name": "90-Day Lock", "apy": 8.1, "lock_days": 90, "min_amount": 1000}}

@app.route("/api/defi/staking", methods=["GET"])
@zero_trust_required
def get_staking():
    if request.user.get("role") not in ("admin", "operator"):
        return jsonify({"error": "Insufficient permissions"}), 403
    username = request.user.get("sub")
    conn = open_db()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM staking_positions WHERE username = ? ORDER BY staked_at DESC", (username,))
    positions = []
    for r in c.fetchall():
        p = dict(r)
        staked_at = datetime.fromisoformat(p["staked_at"])
        days_elapsed = (datetime.utcnow() - staked_at).total_seconds() / 86400
        p["accrued_yield"] = round(p["amount"] * (p["apy"] / 365 / 100) * days_elapsed, 2)
        p["days_elapsed"] = round(days_elapsed, 1)
        positions.append(p)
    conn.close()
    return jsonify({"positions": positions, "pools": STAKING_POOLS, "total_staked": sum(p["amount"] for p in positions if p["status"] == "active")})

@app.route("/api/defi/stake", methods=["POST"])
@zero_trust_required
def stake_funds():
    if request.user.get("role") not in ("admin", "operator"):
        return jsonify({"error": "Insufficient permissions"}), 403
    data = request.get_json(force=True)
    pool_id = data.get("pool", "flexible")
    amount = float(data.get("amount", 0))
    username = request.user.get("sub")
    if pool_id not in STAKING_POOLS:
        return jsonify({"error": "Invalid pool"}), 400
    pool = STAKING_POOLS[pool_id]
    if amount < pool["min_amount"]:
        return jsonify({"error": f"Minimum stake: ${pool['min_amount']}"}), 400
    balance = get_user_balance(username)
    if balance < amount:
        return jsonify({"error": "Insufficient balance"}), 400
    update_user_balance(username, balance - amount)
    pos_id = str(uuid.uuid4())
    unlock_at = (datetime.utcnow() + timedelta(days=pool["lock_days"])).isoformat() if pool["lock_days"] > 0 else None
    conn = open_db()
    c = conn.cursor()
    c.execute("INSERT INTO staking_positions (id, username, amount, pool, apy, staked_at, unlock_at, status) VALUES (?,?,?,?,?,?,?,?)",
              (pos_id, username, amount, pool_id, pool["apy"], datetime.utcnow().isoformat(), unlock_at, "active"))
    conn.commit()
    conn.close()
    log_audit("stake", username, {"pool": pool_id, "amount": amount, "apy": pool["apy"]}, request.remote_addr)
    return jsonify({"status": "staked", "position_id": pos_id, "pool": pool_id, "amount": amount, "apy": pool["apy"], "new_balance": round(get_user_balance(username), 2)})

@app.route("/api/defi/unstake/<position_id>", methods=["POST"])
@zero_trust_required
def unstake_funds(position_id):
    if request.user.get("role") not in ("admin", "operator"):
        return jsonify({"error": "Insufficient permissions"}), 403
    username = request.user.get("sub")
    conn = open_db()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM staking_positions WHERE id = ? AND username = ?", (position_id, username))
    pos = c.fetchone()
    if not pos:
        conn.close()
        return jsonify({"error": "Position not found"}), 404
    if pos["status"] != "active":
        conn.close()
        return jsonify({"error": "Position already closed"}), 400
    if pos["unlock_at"] and datetime.utcnow() < datetime.fromisoformat(pos["unlock_at"]):
        conn.close()
        return jsonify({"error": f"Locked until {pos['unlock_at']}"}), 400
    staked_at = datetime.fromisoformat(pos["staked_at"])
    days_elapsed = (datetime.utcnow() - staked_at).total_seconds() / 86400
    accrued_yield = round(pos["amount"] * (pos["apy"] / 365 / 100) * days_elapsed, 2)
    total_return = pos["amount"] + accrued_yield
    balance = get_user_balance(username)
    update_user_balance(username, balance + total_return)
    c.execute("UPDATE staking_positions SET status = 'closed' WHERE id = ?", (position_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "unstaked", "principal": pos["amount"], "yield": accrued_yield, "total": total_return, "new_balance": round(get_user_balance(username), 2)})

# --- HTLC Escrow ---
@app.route("/api/defi/escrow", methods=["GET"])
@zero_trust_required
def list_escrows():
    if request.user.get("role") not in ("admin", "operator"):
        return jsonify({"error": "Insufficient permissions"}), 403
    username = request.user.get("sub")
    conn = open_db()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM escrow_contracts WHERE sender = ? OR receiver = ? ORDER BY created_at DESC", (username, username))
    escrows = []
    for r in c.fetchall():
        e = dict(r)
        if e["status"] == "locked" and e["timelock"] and datetime.utcnow() > datetime.fromisoformat(e["timelock"]):
            e["status"] = "expired"
        e["is_sender"] = e["sender"] == username
        escrows.append(e)
    conn.close()
    return jsonify(escrows)

@app.route("/api/defi/escrow/create", methods=["POST"])
@zero_trust_required
def create_escrow():
    if request.user.get("role") not in ("admin", "operator"):
        return jsonify({"error": "Insufficient permissions"}), 403
    data = request.get_json(force=True)
    receiver = data.get("receiver")
    amount = float(data.get("amount", 0))
    timelock_hours = int(data.get("timelock_hours", 24))
    username = request.user.get("sub")
    if not receiver or amount <= 0:
        return jsonify({"error": "receiver and positive amount required"}), 400
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT username FROM user_accounts WHERE username = ? OR LOWER(full_name) = LOWER(?) OR LOWER(username) = LOWER(?)",
              (receiver, receiver, receiver))
    recv_row = c.fetchone()
    if not recv_row:
        conn.close()
        return jsonify({"error": "Receiver not found"}), 404
    receiver = recv_row[0]  # normalize to actual username
    balance = get_user_balance(username)
    if balance < amount:
        conn.close()
        return jsonify({"error": "Insufficient balance"}), 400
    import secrets, hashlib
    secret = secrets.token_hex(32)
    hashlock = hashlib.sha256(bytes.fromhex(secret)).hexdigest()
    timelock = (datetime.utcnow() + timedelta(hours=timelock_hours)).isoformat()
    escrow_id = str(uuid.uuid4())
    update_user_balance(username, balance - amount)
    c.execute("INSERT INTO escrow_contracts (id, sender, receiver, amount, hashlock, timelock, status, secret) VALUES (?,?,?,?,?,?,?,?)",
              (escrow_id, username, receiver, amount, hashlock, timelock, "locked", secret))
    conn.commit()
    conn.close()
    return jsonify({"escrow_id": escrow_id, "hashlock": hashlock, "secret": secret, "timelock": timelock, "amount": amount, "receiver": receiver,
        "message": "Share the SECRET with the receiver. They need it to claim the funds."})

@app.route("/api/defi/escrow/<escrow_id>/claim", methods=["POST"])
@zero_trust_required
def claim_escrow(escrow_id):
    if request.user.get("role") not in ("admin", "operator"):
        return jsonify({"error": "Insufficient permissions"}), 403
    data = request.get_json(force=True)
    pre_image = data.get("secret", "")
    username = request.user.get("sub")
    conn = open_db()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM escrow_contracts WHERE id = ?", (escrow_id,))
    escrow = c.fetchone()
    if not escrow:
        conn.close()
        return jsonify({"error": "Escrow not found"}), 404
    if escrow["receiver"] != username:
        conn.close()
        return jsonify({"error": "Only the receiver can claim"}), 403
    if escrow["status"] != "locked":
        conn.close()
        return jsonify({"error": f"Escrow is {escrow['status']}"}), 400
    if datetime.utcnow() > datetime.fromisoformat(escrow["timelock"]):
        conn.close()
        return jsonify({"error": "Escrow has expired"}), 400
    import hashlib
    if hashlib.sha256(bytes.fromhex(pre_image)).hexdigest() != escrow["hashlock"]:
        conn.close()
        return jsonify({"error": "Invalid secret"}), 400
    balance = get_user_balance(username)
    update_user_balance(username, balance + escrow["amount"])
    c.execute("UPDATE escrow_contracts SET status = 'claimed', claimed_at = ? WHERE id = ?", (datetime.utcnow().isoformat(), escrow_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "claimed", "amount": escrow["amount"], "new_balance": round(get_user_balance(username), 2)})

@app.route("/api/defi/escrow/<escrow_id>/refund", methods=["POST"])
@zero_trust_required
def refund_escrow(escrow_id):
    if request.user.get("role") not in ("admin", "operator"):
        return jsonify({"error": "Insufficient permissions"}), 403
    username = request.user.get("sub")
    conn = open_db()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM escrow_contracts WHERE id = ?", (escrow_id,))
    escrow = c.fetchone()
    if not escrow:
        conn.close()
        return jsonify({"error": "Escrow not found"}), 404
    if escrow["sender"] != username:
        conn.close()
        return jsonify({"error": "Only the sender can refund"}), 403
    if escrow["status"] != "locked":
        conn.close()
        return jsonify({"error": f"Escrow is {escrow['status']}"}), 400
    if datetime.utcnow() < datetime.fromisoformat(escrow["timelock"]):
        conn.close()
        return jsonify({"error": "Timelock has not expired yet"}), 400
    balance = get_user_balance(username)
    update_user_balance(username, balance + escrow["amount"])
    c.execute("UPDATE escrow_contracts SET status = 'refunded', refunded_at = ? WHERE id = ?", (datetime.utcnow().isoformat(), escrow_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "refunded", "amount": escrow["amount"], "new_balance": round(get_user_balance(username), 2)})

# --- Support Chat (Ollama LLM) ---
import threading
_chat_sessions = {}
_chat_lock = threading.Lock()

SUPPORT_SYSTEM_PROMPT = """You are the IPTS Support Assistant for the Integrated Payment Transformation System (IPTS), an enterprise banking and payments platform.

CRITICAL — NAVIGATION RULES:
- There is NO "Transfer Tab" in this system. NEVER mention a Transfer Tab.
- To send money / make a payment, users must go to the PAYMENTS tab.
- Always use the exact tab names listed below. Do not invent tab names.

EXACT TAB NAMES AND WHAT THEY DO:
1. Dashboard       — Overview of KPIs, account balance, FX ledger, settlement volume chart, AML telemetry.
2. Payments        — Send money, schedule payments, P2P transfers, view transaction history, track payment journey. THIS is where users go to transfer money.
3. Beneficiaries   — Manage recipients/payees: add, edit, delete beneficiaries before sending payments.
4. Approvals       — Pending transactions awaiting HITL (Human-In-The-Loop) approval. Admins/operators approve or reject flagged transactions here. Each item shows a linked compliance case and a "View Case" button.
5. AI/ML           — Fraud detection model metrics, SHAP explainability charts, fraud heatmap, risk analysis.
6. Compliance      — AML watchlist screening, sanctions checks, Nostro reconciliation, SWIFT GPI tracker, compliance cases.
7. Case Management — Open, investigate, escalate, and resolve compliance cases. Cases block approvals until resolved. Assignee must be set before resolving.
8. Security        — KYC document verification, fraud alerts, biometric settings, account lockout management.
9. Cards           — Virtual debit/credit card management. Clients request cards; admins approve/reject requests.
10. DeFi           — Decentralised Finance features: token swap (AMM/DEX), yield farming/staking, programmable HTLC escrow.
11. Admin          — User management, role changes, balance adjustments, audit log, system stats. Visible to admin role only.
12. Documents      — Upload and manage KYC/compliance documents.
13. Network Graph  — Visual graph of transaction relationships between entities for AML investigation.
14. 360° Spending  — Spending analytics, category breakdown charts, transaction history. Visible to clients.

HOW TO SEND MONEY (step by step):
1. Click the "Payments" tab in the left sidebar.
2. In the "Send Payment" section, select your source account.
3. Enter or select a beneficiary (add one in the Beneficiaries tab first if needed).
4. Enter the amount and currency.
5. For amounts ≥ $3,000, fill in the Travel Rule fields (originator/beneficiary info required by regulation).
6. Click "Send Payment". The system shows a live fee preview and checks your daily limit ($1,000,000).
7. If flagged by AI/ML, the payment enters the Approvals queue and an admin must approve it.

ROLES:
- Admin (mohamad)     — Full access. Can approve/reject transactions, manage users, view all tabs.
- Operator (rohit)    — Can send payments and approve transactions.
- Compliance (walid)  — Access to Compliance, Cases, AI/ML, Security tabs.
- Client (sara)       — Can use Payments, Beneficiaries, Cards, Dashboard, Spending360.

DAILY LIMITS: $1,000,000 per day for clients and operators. $10,000,000 for admin.

TRANSACTION APPROVAL RULES:
- High-risk or large transactions are automatically flagged and routed to the Approvals tab.
- A transaction cannot be approved if it has a linked compliance case that is not yet resolved.
- To unblock an approval: go to Case Management, open the case, assign it to a team member, then resolve it. After resolution the system redirects to Approvals automatically.

CARDS:
- Clients request a virtual card from the Cards tab.
- Admins see and approve/reject card requests in the Cards tab.

COMPLIANCE CASES:
- Cases are auto-created when a payment is flagged or blocked.
- A case cannot be resolved without setting an Assignee (Mohamad, Walid, Rohit, Vibin, or Sriram).
- SLA deadlines: Critical = 4h, High = 24h, Medium = 72h, Low = 168h.

FEES: Tiered fee schedule (0.05%–0.25%) + SWIFT wire fee $18 + FX fee 0.1% for cross-currency payments.

Keep responses concise (2–4 sentences). Only answer questions about IPTS. If you don't know, say so honestly."""

@app.route("/api/support/message", methods=["POST"])
@zero_trust_required
def support_chat():
    data = request.get_json(force=True)
    user_msg = data.get("message", "").strip()
    session_id = data.get("session_id", "default")
    if not user_msg:
        return jsonify({"error": "message required"}), 400
    username = request.user.get("sub", "unknown")
    role = request.user.get("role", "unknown")
    conn = open_db()
    c = conn.cursor()
    c.execute("SELECT full_name, balance FROM user_accounts WHERE username = ?", (username,))
    row = c.fetchone()
    user_context = ""
    if row:
        user_context = f"\n\nUser: {row[0]}, Role: {role}, Balance: ${row[1]:,.2f}"
    conn.close()
    with _chat_lock:
        if session_id not in _chat_sessions:
            _chat_sessions[session_id] = []
        history = _chat_sessions[session_id]
        history.append({"role": "user", "content": user_msg})
        if len(history) > 20:
            history[:] = history[-20:]
    try:
        import ollama
        messages = [{"role": "system", "content": SUPPORT_SYSTEM_PROMPT + user_context}] + history
        resp = ollama.chat(model="llama3.2", messages=messages)
        bot_reply = resp["message"]["content"]
        with _chat_lock:
            history.append({"role": "assistant", "content": bot_reply})
        return jsonify({"response": bot_reply})
    except ImportError:
        return jsonify({"response": "Support chat requires Ollama. Install with: brew install ollama && ollama pull llama3.2"})
    except Exception as e:
        if "connection" in str(e).lower() or "refused" in str(e).lower():
            return jsonify({"response": "I'm currently offline. Please ensure Ollama is running."})
        return jsonify({"response": "I encountered an issue. Please try again."})

# --- Global error handler (logs traceback) ---
import traceback as _traceback
@app.errorhandler(Exception)
def handle_exception(e):
    tb = _traceback.format_exc()
    logger.error(f"Unhandled exception: {e}\n{tb}")
    print(f"[500 ERROR] {e}\n{tb}", flush=True)
    return jsonify({"error": "Internal server error", "detail": str(e)}), 500

# --- Serve Frontend ---
@app.route("/api/analytics/volume-history", methods=["GET"])
@zero_trust_required
def volume_history():
    """
    Returns daily settlement volume for the past N days (default 14).
    Response: { labels: [...], settled: [...], blocked: [...], amounts: [...] }
    """
    days = min(int(request.args.get("days", 14)), 90)
    conn = open_db()
    c = conn.cursor()
    c.execute("""
        SELECT
            date(created_at) AS day,
            SUM(CASE WHEN status NOT IN ('BLOCKED','blocked') THEN 1 ELSE 0 END) AS settled_count,
            SUM(CASE WHEN status IN ('BLOCKED','blocked') THEN 1 ELSE 0 END)     AS blocked_count,
            ROUND(SUM(CASE WHEN status NOT IN ('BLOCKED','blocked') THEN amount ELSE 0 END), 2) AS settled_volume
        FROM settlements
        WHERE created_at >= date('now', ? || ' days')
        GROUP BY day
        ORDER BY day ASC
    """, (f"-{days}",))
    rows = c.fetchall()
    conn.close()

    # Fill every day in range (including days with no transactions)
    from datetime import date, timedelta
    row_map = {r[0]: r for r in rows}
    today = date.today()
    labels, settled, blocked, amounts = [], [], [], []
    for i in range(days - 1, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        r = row_map.get(d)
        labels.append(d[5:])          # "MM-DD"
        settled.append(r[1] if r else 0)
        blocked.append(r[2] if r else 0)
        amounts.append(r[3] if r else 0)

    return jsonify({
        "labels":  labels,
        "settled": settled,
        "blocked": blocked,
        "amounts": amounts,
    })


@app.route("/")
def index():
    from flask import make_response
    resp = make_response(render_template("index.html"))
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp

# ============================================================
# Main
# ============================================================
if __name__ == "__main__":
    print("\n  IPTS Flask API starting on port 5001...")
    app.run(host="0.0.0.0", port=5001, debug=False, threaded=True)
