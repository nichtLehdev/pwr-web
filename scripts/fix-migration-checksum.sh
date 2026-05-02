#!/usr/bin/env bash
# =============================================================================
# Fix Migration Checksum Script (Bash / macOS / Linux)
# =============================================================================
# Updates Prisma migration checksum to match the current migration file content.
#
# Usage:
#   ./scripts/fix-migration-checksum.sh <migration-name>
#   bash scripts/fix-migration-checksum.sh <migration-name>
#
# Example:
#   ./scripts/fix-migration-checksum.sh 20260201120000_add_media_copyright_creator
#
# Requires:
#   - psql (PostgreSQL client)
#   - openssl (for SHA-256; common on macOS/Linux)
#
# Env (same defaults as fix-migration-checksum.ps1):
#   POSTGRES_HOST      (default: localhost)
#   POSTGRES_PORT      (default: 5432)
#   POSTGRES_DB        (default: posaunenwerk)
#   POSTGRES_USER      (default: postgres)
#   POSTGRES_PASSWORD  (required)
# =============================================================================

set -euo pipefail

err() {
  printf 'ERROR: %s\n' "$*" >&2
}

if [[ $# -lt 1 ]] || [[ -z "${1// }" ]]; then
  err "missing migration name"
  printf 'Usage: %s <migration-name>\n' "$0" >&2
  exit 1
fi

MIGRATION_NAME="$1"

if ! [[ "$MIGRATION_NAME" =~ ^[0-9A-Za-z_-]+$ ]]; then
  err "migration name contains unsafe characters (use alphanumeric, hyphen, underscore only)"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MIGRATION_DIR="$REPO_ROOT/prisma/migrations/$MIGRATION_NAME"
MIGRATION_FILE="$MIGRATION_DIR/migration.sql"

if [[ ! -d "$MIGRATION_DIR" ]]; then
  err "migration directory not found: $MIGRATION_DIR"
  exit 1
fi

if [[ ! -f "$MIGRATION_FILE" ]]; then
  err "migration file not found: $MIGRATION_FILE"
  exit 1
fi

DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-posaunenwerk}"
DB_USER="${POSTGRES_USER:-postgres}"

if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
  err "POSTGRES_PASSWORD environment variable is required"
  printf 'Tip: export POSTGRES_PASSWORD=... or use DATABASE_URL-derived credentials separately.\n' >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  err "psql not found — install PostgreSQL client tools"
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  err "openssl not found — needed for checksum (install openssl or use bash 5+ alternatives)"
  exit 1
fi

_sha256_checksum() {
  local f="$1"
  if [[ ! -r "$f" ]]; then
    err "cannot read file: $f"
    exit 1
  fi
  # Prisma migration checksum is SHA-256 hex (lowercase), same as Node crypto.createHash('sha256').
  openssl dgst -sha256 "$f" | awk '{ print $NF }'
}

CHECKSUM="$(_sha256_checksum "$MIGRATION_FILE")"

printf '\n'
printf 'Calculating checksum for migration: %s\n' "$MIGRATION_NAME"
printf 'Migration file: %s\n' "$MIGRATION_FILE"
printf '\n'

if ! [[ "$CHECKSUM" =~ ^[0-9a-f]{64}$ ]]; then
  err "checksum has unexpected shape: '$CHECKSUM' (openssl available?)"
  exit 1
fi

printf 'Calculated checksum: %s\n' "$CHECKSUM"
printf '\n'
printf 'This will update the checksum in the database for migration: %s\n' "$MIGRATION_NAME"
printf 'Database: %s at %s:%s\n' "$DB_NAME" "$DB_HOST" "$DB_PORT"
printf '\n'

read -r -p 'Continue? (yes/no): ' CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  printf 'Cancelled.\n'
  exit 0
fi

TEMP_SQL="$(mktemp "${TMPDIR:-/tmp}/fix-migration-checksum.XXXXXX.sql")"
cleanup() {
  rm -f "$TEMP_SQL"
}
trap cleanup EXIT

# shellcheck disable=SC2312  # command substitution intentionally captures newlines
SQL_TEMPLATE="$(cat <<'EOSQL'
-- Update checksum for migration
UPDATE _prisma_migrations
SET checksum = '__CHECKSUM__'
WHERE migration_name = '__MIGRATION__';

-- Verify the update
SELECT migration_name, checksum, finished_at
FROM _prisma_migrations
WHERE migration_name = '__MIGRATION__';
EOSQL
)"

SQL="$SQL_TEMPLATE"
SQL="${SQL//__CHECKSUM__/$CHECKSUM}"
SQL="${SQL//__MIGRATION__/$MIGRATION_NAME}"
printf '%s\n' "$SQL" >"$TEMP_SQL"

printf '\nUpdating checksum in database...\n'

if PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -f "$TEMP_SQL"; then
  printf '\n[SUCCESS] Checksum updated successfully!\n'
  printf '\nYou can now run '\''pnpm exec prisma migrate status'\'' or '\''npx prisma migrate status'\'' to verify.\n'
else
  err "Failed to update checksum (psql exit code $?)"
  exit 1
fi