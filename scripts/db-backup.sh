#!/bin/bash
# -------------------------------------------------
# Database backup script for Kaari Marketplace
# Backs up Supabase PostgreSQL via pg_dump
# Requires: pg_dump, SUPABASE_DB_URL env var
# -------------------------------------------------

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/kaari_backup_$TIMESTAMP.sql"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Check required env var
if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "Error: SUPABASE_DB_URL is not set"
  echo "Format: postgresql://user:pass@host:port/db"
  exit 1
fi

echo "Starting backup at $TIMESTAMP..."

# Run pg_dump
pg_dump "$SUPABASE_DB_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --verbose \
  > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"
echo "Backup completed: $BACKUP_FILE.gz"

# Clean up old backups
find "$BACKUP_DIR" -name "kaari_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "Cleaned up backups older than $RETENTION_DAYS days"
