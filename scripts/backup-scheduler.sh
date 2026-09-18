#!/bin/sh
# Runs backup-db.sh on BACKUP_SCHEDULE via cron.

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-0 2 * * *}"  # Default: 2 AM daily

mkdir -p "$BACKUP_DIR"

mkdir -p /var/log

echo "Setting up scheduled backups..."
echo "Schedule: $BACKUP_SCHEDULE"
echo "Backup directory: $BACKUP_DIR"

echo "$BACKUP_SCHEDULE /scripts/backup-db.sh $BACKUP_DIR >> /var/log/backup.log 2>&1" > /tmp/crontab
crontab /tmp/crontab
rm /tmp/crontab

echo "Cron job configured:"
crontab -l

echo "Starting cron daemon..."
exec crond -f -l 2
