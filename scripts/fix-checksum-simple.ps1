# =============================================================================
# Simple Fix Migration Checksum Script
# =============================================================================
# Updates the checksum for the problematic migration
# Usage: .\fix-checksum-simple.ps1
# =============================================================================

$migrationName = "20260201120000_add_media_copyright_creator"
$migrationFile = "prisma\migrations\$migrationName\migration.sql"

Write-Host ""
Write-Host "Fixing checksum for migration: $migrationName" -ForegroundColor Cyan
Write-Host ""

# Check if migration file exists
if (-not (Test-Path $migrationFile)) {
    Write-Host "ERROR: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

# Calculate checksum using Node.js (since it's available in the project)
Write-Host "Calculating checksum..." -ForegroundColor Gray
$migrationFileNormalized = $migrationFile -replace '\\', '/'
$checksumOutput = node -e "const crypto = require('crypto'); const fs = require('fs'); const content = fs.readFileSync('$migrationFileNormalized', 'utf8'); const hash = crypto.createHash('sha256').update(content).digest('hex').toUpperCase(); console.log(hash);"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to calculate checksum" -ForegroundColor Red
    exit 1
}

$checksum = $checksumOutput.Trim()
Write-Host "Checksum: $checksum" -ForegroundColor Green
Write-Host ""

Write-Host "Removing migration record to force Prisma to recalculate..." -ForegroundColor Cyan

# Delete the migration record so Prisma can recalculate the checksum correctly
$deleteSqlFile = [System.IO.Path]::GetTempFileName() + ".sql"
$deleteSql = "DELETE FROM _prisma_migrations`nWHERE migration_name = '$migrationName';"

# Write without BOM
[System.IO.File]::WriteAllText($deleteSqlFile, $deleteSql, [System.Text.UTF8Encoding]::new($false))

# Delete the record
npx prisma db execute --file $deleteSqlFile

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Failed to delete migration record" -ForegroundColor Red
    Remove-Item $deleteSqlFile -ErrorAction SilentlyContinue
    exit 1
}

Remove-Item $deleteSqlFile -ErrorAction SilentlyContinue

Write-Host "Marking migration as applied (Prisma will recalculate checksum)..." -ForegroundColor Cyan

# Use Prisma's resolve command to recalculate and mark as applied
npx prisma migrate resolve --applied $migrationName

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Checksum recalculated and updated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verifying..." -ForegroundColor Gray
    npx prisma migrate status
} else {
    Write-Host ""
    Write-Host "[ERROR] Failed to resolve migration" -ForegroundColor Red
    exit 1
}
