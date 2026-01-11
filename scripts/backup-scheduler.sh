#!/bin/sh
# =============================================================================
# Backup Scheduler Entry Point
# =============================================================================
# This script runs the backup on a schedule using cron
# =============================================================================

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-0 2 * * *}"  # Default: 2 AM daily

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create log directory
mkdir -p /var/log

# Create cron job
echo "Setting up scheduled backups..."
echo "Schedule: $BACKUP_SCHEDULE"
echo "Backup directory: $BACKUP_DIR"

# Write cron job to crontab
echo "$BACKUP_SCHEDULE /scripts/backup-db.sh $BACKUP_DIR >> /var/log/backup.log 2>&1" > /tmp/crontab
crontab /tmp/crontab
rm /tmp/crontab

# Verify cron job was set
echo "Cron job configured:"
crontab -l

# Start cron daemon in foreground
echo "Starting cron daemon..."
exec crond -f -l 2
