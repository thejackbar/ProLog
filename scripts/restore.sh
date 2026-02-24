#!/usr/bin/env bash
# ProLog database restore script
# Usage: ./scripts/restore.sh [backup_file.sql.gz]
# If no file is given, lists available backups and prompts you to choose one.
#
# WARNING: This will DROP and recreate all tables. All current data will be lost.

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
ENV_FILE="$PROJECT_DIR/.env"
CONTAINER="prolog-db"
# ──────────────────────────────────────────────────────────────────────────────

# Load .env
if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source <(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$')
    set +a
else
    echo "ERROR: .env file not found at $ENV_FILE" >&2
    exit 1
fi

DB_USER="${DB_USER:-prolog}"
DB_NAME="${DB_NAME:-prolog}"

# ── Select backup file ────────────────────────────────────────────────────────
if [[ $# -ge 1 ]]; then
    BACKUP_FILE="$1"
    # Allow bare filename (assume backups dir) or full path
    if [[ ! -f "$BACKUP_FILE" ]]; then
        BACKUP_FILE="$BACKUP_DIR/$1"
    fi
else
    mapfile -t BACKUPS < <(find "$BACKUP_DIR" -maxdepth 1 -name 'prolog_*.sql.gz' | sort -r)
    if [[ ${#BACKUPS[@]} -eq 0 ]]; then
        echo "No backups found in $BACKUP_DIR" >&2
        exit 1
    fi

    echo "Available backups (newest first):"
    for i in "${!BACKUPS[@]}"; do
        SIZE=$(du -sh "${BACKUPS[$i]}" | cut -f1)
        printf "  [%d] %s  (%s)\n" "$((i+1))" "$(basename "${BACKUPS[$i]}")" "$SIZE"
    done
    echo ""
    read -rp "Enter number to restore [1]: " CHOICE
    CHOICE="${CHOICE:-1}"

    if ! [[ "$CHOICE" =~ ^[0-9]+$ ]] || (( CHOICE < 1 || CHOICE > ${#BACKUPS[@]} )); then
        echo "Invalid selection." >&2
        exit 1
    fi
    BACKUP_FILE="${BACKUPS[$((CHOICE-1))]}"
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE" >&2
    exit 1
fi

# ── Confirm ───────────────────────────────────────────────────────────────────
echo ""
echo "  Backup : $(basename "$BACKUP_FILE") ($(du -sh "$BACKUP_FILE" | cut -f1))"
echo "  Target : $DB_NAME on container $CONTAINER"
echo ""
echo "  WARNING: All current data in '$DB_NAME' will be replaced."
read -rp "  Type 'yes' to continue: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
    echo "Aborted."
    exit 0
fi

# ── Verify container ──────────────────────────────────────────────────────────
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "ERROR: Container '$CONTAINER' is not running." >&2
    exit 1
fi

echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restoring from $(basename "$BACKUP_FILE") …"

# Drop all tables owned by DB_USER, then restore
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" <<'SQL'
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;
SQL

# Decompress and pipe SQL into the container
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restore complete."

# Quick row-count summary
echo ""
echo "Row counts after restore:"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
    "SELECT table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I', table_name), false, true, '')))[1]::text::int AS rows
     FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
