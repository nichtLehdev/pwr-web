#!/bin/sh
# =============================================================================
# Database Backup Script
# =============================================================================
# Creates a compressed PostgreSQL backup using pg_dump
# Usage: ./backup-db.sh [backup-dir]
# =============================================================================

set -e

# Default backup directory
BACKUP_DIR="${1:-/backups}"

# Get database connection details from environment
DB_HOST="${POSTGRES_HOST:-posaunenwerk-db}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-posaunenwerk}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD}"

# Validate required environment variables
if [ -z "$DB_PASSWORD" ]; then
  echo "ERROR: POSTGRES_PASSWORD environment variable is required"
  exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/posaunenwerk_backup_${TIMESTAMP}.sql.gz"

# Export password for pg_dump
export PGPASSWORD="$DB_PASSWORD"

# Perform the backup
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

  # Get file size
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
