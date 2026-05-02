# =============================================================================
# Fix Migration Checksum Script (Windows PowerShell)
# =============================================================================
# Updates Prisma migration checksum to match the current migration file
# Usage: .\fix-migration-checksum.ps1 <migration-name>
# Example: .\fix-migration-checksum.ps1 20260201120000_add_media_copyright_creator
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$MigrationName
)

# Error handling
$ErrorActionPreference = "Stop"

# Check if migration directory exists
$migrationPath = "prisma\migrations\$MigrationName"
if (-not (Test-Path $migrationPath)) {
    Write-Host "ERROR: Migration directory not found: $migrationPath" -ForegroundColor Red
    exit 1
}

$migrationFile = Join-Path $migrationPath "migration.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "ERROR: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

# Get database connection details from environment
$DB_HOST = if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "localhost" }
$DB_PORT = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { "5432" }
$DB_NAME = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "posaunenwerk" }
$DB_USER = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }
$DB_PASSWORD = $env:POSTGRES_PASSWORD

# Validate required environment variables
if (-not $DB_PASSWORD) {
    Write-Host "ERROR: POSTGRES_PASSWORD environment variable is required" -ForegroundColor Red
    Write-Host "You can also use DATABASE_URL from your .env file" -ForegroundColor Yellow
    exit 1
}

# Check if psql is available
$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCmd) {
    Write-Host "ERROR: psql command not found. Please ensure PostgreSQL client tools are installed and in PATH." -ForegroundColor Red
    Write-Host "You can install PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}
$psqlPath = $psqlCmd.Source

Write-Host ""
Write-Host "Calculating checksum for migration: $MigrationName" -ForegroundColor Cyan
Write-Host "Migration file: $migrationFile" -ForegroundColor Gray
Write-Host ""

# Read migration file content
$migrationContent = Get-Content $migrationFile -Raw -Encoding UTF8

# Calculate SHA256 hash (Prisma uses SHA256)
$sha256 = [System.Security.Cryptography.SHA256]::Create()
$bytes = [System.Text.Encoding]::UTF8.GetBytes($migrationContent)
$hashBytes = $sha256.ComputeHash($bytes)
$sha256.Dispose()

# Prisma stores SHA-256 as lowercase hex (matches Node crypto digest('hex'))
$checksum = ($hashBytes | ForEach-Object { $_.ToString("x2") }) -join ""

Write-Host "Calculated checksum: $checksum" -ForegroundColor Green
Write-Host ""

# Confirm update
Write-Host "This will update the checksum in the database for migration: $MigrationName" -ForegroundColor Yellow
Write-Host "Database: $DB_NAME at ${DB_HOST}:${DB_PORT}" -ForegroundColor Gray
Write-Host ""
$confirm = Read-Host "Continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# Create SQL to update checksum
$updateSql = @"
-- Update checksum for migration
UPDATE _prisma_migrations
SET checksum = '$checksum'
WHERE migration_name = '$MigrationName';

-- Verify the update
SELECT migration_name, checksum, finished_at
FROM _prisma_migrations
WHERE migration_name = '$MigrationName';
"@

# Write SQL to temp file
$tempSqlFile = [System.IO.Path]::GetTempFileName() + ".sql"
$updateSql | Out-File -FilePath $tempSqlFile -Encoding UTF8

try {
    # Set PGPASSWORD environment variable for psql
    $env:PGPASSWORD = $DB_PASSWORD
    
    Write-Host "Updating checksum in database..." -ForegroundColor Cyan
    
    # Execute SQL
    & $psqlPath -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $tempSqlFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] Checksum updated successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now run 'npx prisma migrate status' to verify." -ForegroundColor Cyan
        exit 0
    } else {
        throw "SQL execution failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "[ERROR] Failed to update checksum!" -ForegroundColor Red
    $errorMessage = $_.Exception.Message
    Write-Host "Error: $errorMessage" -ForegroundColor Red
    exit 1
} finally {
    # Clean up
    Remove-Item $tempSqlFile -ErrorAction SilentlyContinue
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
