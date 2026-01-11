# Database Backup Guide

This document describes the automated database backup system for Posaunenwerk.

## Overview

The backup system automatically creates compressed PostgreSQL backups on a schedule using `pg_dump`. Backups are stored in a Docker volume and automatically cleaned up based on retention settings.

## Features

- **Automated scheduled backups** using cron
- **Compressed backups** (gzip) to save space
- **Automatic cleanup** of old backups based on retention policy
- **Easy restore** process for disaster recovery
- **Docker-based** - runs as a separate service

## Configuration

### Environment Variables

Add these to your `.env` file to customize backup behavior:

```env
# Backup schedule (cron format)
# Default: 0 2 * * * (2 AM daily)
BACKUP_SCHEDULE=0 2 * * *

# Retention period in days
# Default: 30 (keeps backups for 30 days)
BACKUP_RETENTION_DAYS=30
```

### Cron Schedule Examples

- `0 2 * * *` - Daily at 2 AM (default)
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 2 * * 1` - Weekly on Monday at 2 AM
- `0 2 1 * *` - Monthly on the 1st at 2 AM

## Usage

### Starting the Backup Service

The backup service is automatically started with your Docker Compose stack:

```bash
# Development
docker compose up -d

# Production
docker compose -f docker-compose.prod.yml up -d
```

The backup service will:
1. Wait for the database to be healthy
2. Set up a cron job based on `BACKUP_SCHEDULE`
3. Run backups automatically on schedule

### Manual Backup

You can trigger a manual backup at any time:

```bash
# Run backup manually
docker compose exec db-backup /scripts/backup-db.sh /backups
```

### Viewing Backups

List all available backups:

```bash
# List backup files
docker compose exec db-backup ls -lh /backups

# Or access the backup volume directly
docker volume inspect posaunenwerk_backup_data
```

### Viewing Backup Logs

Check backup execution logs:

```bash
# View backup service logs
docker compose logs db-backup

# View cron execution logs
docker compose exec db-backup cat /var/log/backup.log
```

## Restoring from Backup

### Prerequisites

⚠️ **WARNING**: Restoring will replace all current database data. Always ensure you have a current backup before restoring.

### Restore Process

1. **List available backups:**
   ```bash
   docker compose exec db-backup ls -lh /backups
   ```

2. **Copy backup file to host** (if needed):
   ```bash
   docker compose cp db-backup:/backups/posaunenwerk_backup_20240115_020000.sql.gz ./backup.sql.gz
   ```

3. **Restore the database:**
   ```bash
   # Option 1: Using the restore script (interactive)
   docker compose exec db-backup /scripts/restore-db.sh /backups/posaunenwerk_backup_20240115_020000.sql.gz

   # Option 2: Manual restore
   docker compose exec -T db-backup gunzip -c /backups/posaunenwerk_backup_20240115_020000.sql.gz | \
     docker compose exec -T posaunenwerk-db psql -U postgres -d posaunenwerk
   ```

### Restore from Host

If you have a backup file on your host machine:

```bash
# Copy backup into container
docker compose cp ./backup.sql.gz db-backup:/backups/restore.sql.gz

# Restore
docker compose exec db-backup /scripts/restore-db.sh /backups/restore.sql.gz
```

## Backup Storage

### Location

Backups are stored in a Docker volume named `posaunenwerk_backup_data`. This volume persists even if containers are recreated.

### Backup File Format

Backup files are named with the pattern:
```
posaunenwerk_backup_YYYYMMDD_HHMMSS.sql.gz
```

Example: `posaunenwerk_backup_20240115_020000.sql.gz`

### Backup Size

Backup sizes vary based on database size. Typical backups are 10-50% of the original database size due to compression.

### Storage Management

- Old backups are automatically deleted based on `BACKUP_RETENTION_DAYS`
- Manual cleanup can be done by removing files from `/backups` in the container
- Consider backing up the backup volume itself for off-site storage

## Off-Site Backup Strategy

For production environments, consider implementing off-site backups:

### Option 1: Copy to External Storage

```bash
# Copy backups to external storage (e.g., S3, NFS, etc.)
docker compose cp db-backup:/backups/posaunenwerk_backup_*.sql.gz /mnt/external-backups/
```

### Option 2: Automated Off-Site Sync

You can extend the backup script to automatically sync to:
- AWS S3
- Google Cloud Storage
- Azure Blob Storage
- SFTP server
- NFS mount

### Option 3: Backup Volume Replication

Replicate the entire backup volume to another location:

```bash
# Create a backup of the backup volume
docker run --rm \
  -v posaunenwerk_backup_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/backup-volume-$(date +%Y%m%d).tar.gz /data
```

## Monitoring

### Check Backup Service Status

```bash
# Check if backup service is running
docker compose ps db-backup

# Check service health
docker compose exec db-backup crontab -l
```

### Verify Recent Backups

```bash
# List recent backups
docker compose exec db-backup ls -lht /backups | head -10

# Check backup file integrity
docker compose exec db-backup gunzip -t /backups/posaunenwerk_backup_*.sql.gz
```

### Set Up Alerts

Consider setting up monitoring to alert if:
- No backup has been created in the last 24 hours
- Backup service container is not running
- Backup files are corrupted
- Backup volume is running out of space

## Troubleshooting

### Backup Service Not Running

```bash
# Check service status
docker compose ps db-backup

# View logs
docker compose logs db-backup

# Restart service
docker compose restart db-backup
```

### Backups Not Being Created

1. Check cron is running:
   ```bash
   docker compose exec db-backup crontab -l
   ```

2. Check backup logs:
   ```bash
   docker compose exec db-backup cat /var/log/backup.log
   ```

3. Verify database connection:
   ```bash
   docker compose exec db-backup pg_isready -h posaunenwerk-db
   ```

4. Test manual backup:
   ```bash
   docker compose exec db-backup /scripts/backup-db.sh /backups
   ```

### Restore Fails

1. Verify backup file integrity:
   ```bash
   docker compose exec db-backup gunzip -t /backups/backup_file.sql.gz
   ```

2. Check database connection:
   ```bash
   docker compose exec posaunenwerk-db pg_isready
   ```

3. Ensure database is not in use (consider stopping the app temporarily)

### Out of Disk Space

If the backup volume runs out of space:

1. Check volume size:
   ```bash
   docker system df -v
   ```

2. Reduce retention period:
   ```env
   BACKUP_RETENTION_DAYS=7
   ```

3. Manually clean old backups:
   ```bash
   docker compose exec db-backup find /backups -name "*.sql.gz" -mtime +7 -delete
   ```

## Best Practices

1. **Test restores regularly** - Verify backups work by testing restore on a non-production database
2. **Monitor backup success** - Set up alerts for backup failures
3. **Off-site backups** - Don't rely solely on local backups
4. **Document restore procedures** - Keep this guide accessible to your team
5. **Version control** - Consider versioning your backup scripts
6. **Encryption** - For sensitive data, consider encrypting backups
7. **Retention policy** - Balance storage costs with recovery needs

## Security Considerations

- Backup files contain all database data - protect them accordingly
- Ensure backup volume has appropriate permissions
- Consider encrypting backups for sensitive data
- Limit access to backup files and restore scripts
- Regularly rotate backup storage credentials if using cloud storage
