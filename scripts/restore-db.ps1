# =============================================================================
# Database Restore Script (Windows PowerShell)
# =============================================================================
# Restores a PostgreSQL database from a compressed backup file
# Usage: .\restore-db.ps1 <backup-file>
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

# Error handling
$ErrorActionPreference = "Stop"

# Check if backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Host "ERROR: Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

# Get database connection details from environment
$DB_HOST = if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "posaunenwerk-db" }
$DB_PORT = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { "5432" }
$DB_NAME = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "posaunenwerk" }
$DB_USER = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }
$DB_PASSWORD = $env:POSTGRES_PASSWORD

# Validate required environment variables
if (-not $DB_PASSWORD) {
    Write-Host "ERROR: POSTGRES_PASSWORD environment variable is required" -ForegroundColor Red
    exit 1
}

# Confirm restore action (skip if SKIP_CONFIRM is set)
if (-not $env:SKIP_CONFIRM) {
    Write-Host ""
    Write-Host "WARNING: This will replace all data in the database!" -ForegroundColor Yellow
    Write-Host "Database: $DB_NAME"
    Write-Host "Host: ${DB_HOST}:${DB_PORT}"
    Write-Host "Backup file: $BackupFile"
    Write-Host ""
    $confirm = Read-Host "Are you sure you want to continue? (yes/no)"
    
    if ($confirm -ne "yes") {
        Write-Host "Restore cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Check if gunzip/7zip is available for decompression
$use7zip = $false
$gunzipCmd = Get-Command gunzip -ErrorAction SilentlyContinue
$7zipCmd = Get-Command 7z -ErrorAction SilentlyContinue
$7zipPath = $null

if ($7zipCmd) {
    $7zipPath = $7zipCmd.Source
    $use7zip = $true
} elseif (-not $gunzipCmd) {
    # Try to find 7zip in common locations
    $7zipPaths = @(
        "${env:ProgramFiles}\7-Zip\7z.exe",
        "${env:ProgramFiles(x86)}\7-Zip\7z.exe",
        "$env:LOCALAPPDATA\Programs\7-Zip\7z.exe"
    )
    
    foreach ($path in $7zipPaths) {
        if (Test-Path $path) {
            $7zipPath = $path
            $use7zip = $true
            break
        }
    }
    
    if (-not $7zipPath) {
        Write-Host "ERROR: Neither gunzip nor 7zip found. Please install one of them:" -ForegroundColor Red
        Write-Host "  - gunzip (part of Git for Windows or WSL)" -ForegroundColor Yellow
        Write-Host "  - 7-Zip (https://www.7-zip.org/)" -ForegroundColor Yellow
        exit 1
    }
}

# Check if psql is available
$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCmd) {
    Write-Host "ERROR: psql command not found. Please ensure PostgreSQL client tools are installed and in PATH." -ForegroundColor Red
    Write-Host "You can install PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}
$psqlPath = $psqlCmd.Source

# Restore the database
Write-Host ""
Write-Host "Starting database restore..." -ForegroundColor Green
Write-Host "This may take a few minutes..."
Write-Host ""

try {
    # Set PGPASSWORD environment variable for psql
    $env:PGPASSWORD = $DB_PASSWORD
    
    if ($use7zip) {
        # Use 7zip to decompress and pipe to psql
        Write-Host "Using 7-Zip for decompression..." -ForegroundColor Cyan
        
        # 7zip with -so outputs to stdout, pipe directly to psql
        # Redirect stderr to null to avoid mixing errors with SQL data
        & $7zipPath e -so "$BackupFile" 2>$null | & $psqlPath -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --quiet
        
        # Check psql exit code (7zip errors would cause psql to fail)
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Database restored successfully from: $BackupFile" -ForegroundColor Green
            exit 0
        } else {
            throw "Restore failed with exit code $LASTEXITCODE"
        }
    } else {
        # Use gunzip (from Git for Windows or WSL) - can pipe directly
        Write-Host "Using gunzip for decompression..." -ForegroundColor Cyan
        
        gunzip -c "$BackupFile" | & $psqlPath -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --quiet
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Database restored successfully from: $BackupFile" -ForegroundColor Green
            exit 0
        } else {
            throw "Restore failed with exit code $LASTEXITCODE"
        }
    }
} catch {
    Write-Host ""
    Write-Host "Restore failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
