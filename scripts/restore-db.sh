#!/bin/sh
# Restores the database from a compressed backup. Usage: ./restore-db.sh <backup-file>

set -e

if [ -z "$1" ]; then
  echo "ERROR: Backup file path is required"
  echo "Usage: ./restore-db.sh <backup-file>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

DB_HOST="${POSTGRES_HOST:-posaunenwerk-db}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-posaunenwerk}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD}"

if [ -z "$DB_PASSWORD" ]; then
  echo "ERROR: POSTGRES_PASSWORD environment variable is required"
  exit 1
fi

# Confirm restore action (skip if SKIP_CONFIRM is set)
if [ -z "$SKIP_CONFIRM" ]; then
  echo "WARNING: This will replace all data in the database!"
  echo "Database: $DB_NAME"
  echo "Host: $DB_HOST:$DB_PORT"
  echo "Backup file: $BACKUP_FILE"
  echo ""
  printf "Are you sure you want to continue? (yes/no): "
  read CONFIRM

  if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
  fi
fi

export PGPASSWORD="$DB_PASSWORD"

echo "Starting database restore..."
echo "This may take a few minutes..."

if gunzip -c "$BACKUP_FILE" | psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --quiet; then
  echo "✓ Database restored successfully from: $BACKUP_FILE"
  exit 0
else
  echo "✗ Restore failed!"
  exit 1
fi
