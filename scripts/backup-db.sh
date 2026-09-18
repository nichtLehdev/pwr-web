#!/bin/sh
# Compressed pg_dump backup. Usage: ./backup-db.sh [backup-dir]

set -e

BACKUP_DIR="${1:-/backups}"

DB_HOST="${POSTGRES_HOST:-posaunenwerk-db}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-posaunenwerk}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD}"

if [ -z "$DB_PASSWORD" ]; then
  echo "ERROR: POSTGRES_PASSWORD environment variable is required"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/posaunenwerk_backup_${TIMESTAMP}.sql.gz"

export PGPASSWORD="$DB_PASSWORD"

echo "Starting database backup..."
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "Backup file: $BACKUP_FILE"

if pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  | gzip > "$BACKUP_FILE"; then
  echo "✓ Backup completed successfully: $BACKUP_FILE"

  FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "  Backup size: $FILE_SIZE"

  # Clean up old backups (keep last 30 days by default)
  RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
  echo "Cleaning up backups older than $RETENTION_DAYS days..."
  find "$BACKUP_DIR" -name "posaunenwerk_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
  echo "✓ Cleanup completed"

  exit 0
else
  echo "✗ Backup failed!"
  exit 1
fi
