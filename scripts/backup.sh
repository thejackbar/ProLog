#!/usr/bin/env bash
# ProLog database backup script
# Usage: ./scripts/backup.sh
# Dumps the prolog PostgreSQL database, compresses it, and prunes old backups.
# Designed to be run manually or via cron.

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
ENV_FILE="$PROJECT_DIR/.env"
CONTAINER="prolog-db"
KEEP_DAYS=30
# ──────────────────────────────────────────────────────────────────────────────

# Load .env for DB credentials (ignore lines starting with #, handle quoted values)
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

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/prolog_${TIMESTAMP}.sql.gz"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup → $BACKUP_FILE"

# Verify the container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "ERROR: Container '$CONTAINER' is not running." >&2
    exit 1
fi

# Dump and compress in one pass
docker exec "$CONTAINER" \
    pg_dump -U "$DB_USER" -d "$DB_NAME" --no-password \
    | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complete — $SIZE"

# Prune backups older than KEEP_DAYS
PRUNED=$(find "$BACKUP_DIR" -maxdepth 1 -name 'prolog_*.sql.gz' \
    -mtime "+$KEEP_DAYS" -print -delete | wc -l)
if [[ "$PRUNED" -gt 0 ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pruned $PRUNED backup(s) older than ${KEEP_DAYS} days"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done. Backups in $BACKUP_DIR:"
ls -lh "$BACKUP_DIR"/prolog_*.sql.gz 2>/dev/null | awk '{print "  " $5 "  " $9}'
