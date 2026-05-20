#!/bin/sh
# =============================================================================
# Registration-closed notification cron (calls app HTTP endpoint)
# =============================================================================

set -eu

CRON_SCHEDULE="${REGISTRATION_CLOSED_CRON_SCHEDULE:-0 */6 * * *}"
APP_INTERNAL_URL="${APP_INTERNAL_URL:-http://app:3000}"
CRON_SECRET="${CRON_SECRET:?CRON_SECRET is required for registration-closed-cron}"

mkdir -p /var/log

cat > /scripts/run-registration-closed-cron.sh << 'WRAPPER'
#!/bin/sh
set -eu
. /scripts/cron-env.sh
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
log "Running registration-closed cron..."
http_code=$(curl -s -o /tmp/cron-response.json -w "%{http_code}" -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${APP_INTERNAL_URL}/api/cron/registration-closed") || http_code="000"
log "HTTP ${http_code}"
if [ -f /tmp/cron-response.json ]; then
  cat /tmp/cron-response.json
  echo ""
fi
if [ "$http_code" != "200" ]; then
  log "Cron run failed (expected HTTP 200)"
  exit 1
fi
WRAPPER

# Env file for cron jobs (dcron does not pass container env into job context)
cat > /scripts/cron-env.sh << EOF
CRON_SECRET=${CRON_SECRET}
APP_INTERNAL_URL=${APP_INTERNAL_URL}
EOF

chmod +x /scripts/run-registration-closed-cron.sh

echo "Registration-closed cron schedule: ${CRON_SCHEDULE}"
echo "App URL: ${APP_INTERNAL_URL}"

echo "${CRON_SCHEDULE} /scripts/run-registration-closed-cron.sh >> /var/log/registration-closed-cron.log 2>&1" > /tmp/crontab
crontab /tmp/crontab
rm /tmp/crontab
crontab -l

wait_for_app() {
  echo "Waiting for app at ${APP_INTERNAL_URL}..."
  attempts=0
  max_attempts=60
  while [ "$attempts" -lt "$max_attempts" ]; do
    code=$(curl -s -o /dev/null -w "%{http_code}" -X GET \
      "${APP_INTERNAL_URL}/api/cron/registration-closed" 2>/dev/null || echo "000")
    # 401 = app up, cron auth required; 503 = SMTP not configured but app reachable
    if [ "$code" = "401" ] || [ "$code" = "503" ] || [ "$code" = "200" ]; then
      echo "App is reachable (HTTP ${code})"
      return 0
    fi
    attempts=$((attempts + 1))
    sleep 5
  done
  echo "App did not become reachable in time"
  return 1
}

if wait_for_app; then
  echo "Running initial registration-closed check..."
  /scripts/run-registration-closed-cron.sh >> /var/log/registration-closed-cron.log 2>&1 || true
fi

echo "Starting cron daemon..."
exec crond -f -l 2
