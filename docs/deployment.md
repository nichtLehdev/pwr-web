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

## Database Backups

```bash
# Backup
docker compose exec db pg_dump -U posaunenwerk posaunenwerk > backup.sql

# Restore
docker compose exec -T db psql -U posaunenwerk posaunenwerk < backup.sql
```

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

