# Deployment Guide

## Production Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/posaunenwerk

# Authentication
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
BETTER_AUTH_GITHUB_CLIENT_ID=<github-oauth-client-id>
BETTER_AUTH_GITHUB_CLIENT_SECRET=<github-oauth-secret>
BETTER_AUTH_URL=https://your-domain.com

# GitHub (for file storage)
GITHUB_TOKEN=<github-personal-access-token>
GITHUB_REPO=owner/repo

# Email (optional but recommended)
SMTP_HOST=mail.your-domain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@your-domain.com
SMTP_PASSWORD=<email-password>
SMTP_FROM=noreply@your-domain.com

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Docker Production

```bash
# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f app

# Stop
docker compose -f docker-compose.prod.yml down
```

### Resolving failed migrations

If the `db-migrate` service exits with an error like **"migrate found failed migrations in the target database"** (P3009), you need to resolve the failed migration before new ones can run.

**Option A – Migration actually succeeded (e.g. timeout after applying):**  
If the migration’s SQL has already been applied (e.g. columns exist), mark it as applied:

```bash
# Production (docker-compose.prod.yml)
docker compose -f docker-compose.prod.yml run --rm db-migrate pnpm prisma migrate resolve --applied 20260201120000_add_media_copyright_creator

# Local (docker-compose.yml)
docker compose run --rm db-migrate pnpm prisma migrate resolve --applied 20260201120000_add_media_copyright_creator
```

Then start the stack again; the app should come up.

**Option B – Migration did not apply:**  
If the migration never ran successfully, mark it as rolled back so it will run again on the next deploy:

```bash
docker compose -f docker-compose.prod.yml run --rm db-migrate pnpm prisma migrate resolve --rolled-back 20260201120000_add_media_copyright_creator
```

Then run `docker compose -f docker-compose.prod.yml up -d` again so `db-migrate` runs and applies the migration.

For other failed migrations, replace `20260201120000_add_media_copyright_creator` with the migration name shown in the error.

## Database Backups

The application includes an automated backup system. See [Backups Documentation](./backups.md) for complete details.

### Quick Reference

**Automated Backups:**
- Backups run automatically on a schedule (default: daily at 2 AM)
- Configure via `BACKUP_SCHEDULE` and `BACKUP_RETENTION_DAYS` environment variables
- Backups are stored in the `posaunenwerk_backup_data` Docker volume

**Manual Backup:**
```bash
docker compose exec db-backup /scripts/backup-db.sh /backups
```

**List Backups:**
```bash
docker compose exec db-backup ls -lh /backups
```

**Restore from Backup:**
```bash
docker compose exec db-backup /scripts/restore-db.sh /backups/posaunenwerk_backup_YYYYMMDD_HHMMSS.sql.gz
```

For detailed backup and restore procedures, see [Backups Documentation](./backups.md).

## Reverse Proxy (nginx example)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Health Checks

- Application: `https://your-domain.com/api/health` (if implemented)
- Database: `docker compose exec db pg_isready`

## Monitoring

- Application logs: `docker compose logs -f app`
- Database logs: `docker compose logs -f db`
- Database size: `docker compose exec db psql -U posaunenwerk -c "SELECT pg_size_pretty(pg_database_size('posaunenwerk'));"`

