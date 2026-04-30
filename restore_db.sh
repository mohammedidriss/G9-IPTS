#!/usr/bin/env bash
# ============================================================
# IPTS — Restore database from latest GitHub backup
# Usage: bash restore_db.sh
#        bash restore_db.sh --backup backup/ipts_vault_20260430.sql
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Parse optional --backup argument
BACKUP_FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --backup) BACKUP_FILE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Auto-select most recent backup if not specified
if [ -z "$BACKUP_FILE" ]; then
    BACKUP_FILE=$(ls -t backup/ipts_vault_*.sql 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        echo "✗ No backup file found in backup/ folder. Run 'git pull' first."
        exit 1
    fi
fi

echo ""
echo "  Backup file : $BACKUP_FILE"

# Warn if a live DB already exists
if [ -f "ipts_vault.db" ]; then
    echo "  ⚠ Warning: ipts_vault.db already exists and will be replaced."
    read -p "  Continue? (y/N) " CONFIRM
    if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
        echo "  Aborted."
        exit 0
    fi
    # Keep a timestamped copy before overwriting
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    cp ipts_vault.db "ipts_vault.db.bak_${TIMESTAMP}"
    echo "  ✓ Saved existing DB as ipts_vault.db.bak_${TIMESTAMP}"
    rm ipts_vault.db
fi

sqlite3 ipts_vault.db < "$BACKUP_FILE"
echo "  ✓ Database restored from $BACKUP_FILE"
echo "  Restart the server to use the restored data."
echo ""
