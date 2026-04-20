#!/usr/bin/env python3
"""
IPTS Database Reset Tool
========================
Wipes all data and reinitialises to factory defaults.
Run: python3 reset_db.py
"""

import sqlite3
import os
import sys
import shutil
from datetime import datetime

DB_PATH    = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".runtime", "ipts_vault.db")
BACKUP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".runtime")

DEFAULT_USERS = [
    ("mohamad", "Mohamad Idriss",          1_000_000.00, "USD"),
    ("rohit",   "Rohit Jacob Isaac",         750_000.00, "USD"),
    ("sriram",  "Sriram Acharya Mudumbai",   500_000.00, "USD"),
    ("walid",   "Walid Elmahdy",             350_000.00, "USD"),
    ("vibin",   "Vibin Chandrabose",         150_000.00, "USD"),
]

DEFAULT_AMM_POOLS = [
    ("USD/ETH",  500_000,   250,       500_000 * 250),
    ("USD/BTC",  500_000,    10,       500_000 * 10),
    ("USD/USDC", 1_000_000, 1_000_000, 1_000_000 * 1_000_000),
    ("ETH/BTC",  500,        10,       500 * 10),
]

TABLES_TO_CLEAR = [
    "settlements",
    "hitl_queue",
    "four_eyes_approvals",
    "audit_log",
    "pii_vault",
    "virtual_cards",
    "kyc_verifications",
    "swift_gpi_tracker",
    "compliance_cases",
    "swap_history",
    "staking_positions",
    "escrow_contracts",
    "beneficiaries",
    "sanctions_list",
]

def reset():
    print("=" * 55)
    print("  IPTS Database Reset Tool")
    print("=" * 55)

    if not os.path.exists(DB_PATH):
        print(f"\n❌  Database not found:\n    {DB_PATH}")
        sys.exit(1)

    print(f"\n⚠️   This will wipe ALL data from:\n    {DB_PATH}\n")
    confirm = input("Type  RESET  to confirm: ").strip()
    if confirm != "RESET":
        print("\n❌  Aborted.")
        sys.exit(0)

    # Backup
    backup_path = os.path.join(BACKUP_DIR, f"ipts_vault_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db")
    shutil.copy2(DB_PATH, backup_path)
    print(f"\n✅  Backup saved → {os.path.basename(backup_path)}")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("PRAGMA foreign_keys = OFF")

    # Clear tables
    print("\n🗑️   Clearing tables...")
    for table in TABLES_TO_CLEAR:
        try:
            c.execute(f"DELETE FROM {table}")
            print(f"    cleared  {table}")
        except sqlite3.OperationalError:
            print(f"    skipped  {table} (not found)")

    try:
        c.execute("DELETE FROM sqlite_sequence")
    except Exception:
        pass

    # Reset balances
    print("\n💰  Resetting user balances...")
    for username, full_name, balance, currency in DEFAULT_USERS:
        c.execute(
            "UPDATE user_accounts SET balance=?, updated_at=? WHERE username=?",
            (balance, datetime.now().isoformat(), username)
        )
        print(f"    {username:12s}  →  ${balance:>12,.2f} {currency}")

    # Reset AMM pools
    print("\n🔄  Resetting AMM pools...")
    c.execute("DELETE FROM amm_pools")
    for pair, rb, rq, k in DEFAULT_AMM_POOLS:
        c.execute(
            "INSERT INTO amm_pools (pair, reserve_base, reserve_quote, k_constant, total_volume, swap_count) VALUES (?,?,?,?,0,0)",
            (pair, rb, rq, k)
        )
        print(f"    {pair:12s}  reserves: {rb:>12,.0f} / {rq:>10,.0f}")

    c.execute("PRAGMA foreign_keys = ON")
    conn.commit()
    conn.close()

    print("\n" + "=" * 55)
    print("  ✅  Database reset complete!")
    print("=" * 55)
    print("\nRestart the app to apply changes:")
    print("  cd /Users/mohamadidriss/Projects/IPTS")
    print("  source .venv/bin/activate && python3 .runtime/app.py\n")

if __name__ == "__main__":
    reset()
