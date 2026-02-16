# =============================================================================
# Backup to Seed Script
# =============================================================================
# Converts a SQL backup file into Prisma seed functions
# Usage: .\backup-to-seed.ps1 <backup-file> [output-dir]
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputDir = "prisma\seed-data-from-backup"
)

Write-Host ""
Write-Host "Converting backup to seed data..." -ForegroundColor Cyan
Write-Host "Backup file: $BackupFile" -ForegroundColor Gray
Write-Host "Output directory: $OutputDir" -ForegroundColor Gray
Write-Host ""

# Check if backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Host "ERROR: Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

# Check if Node.js is available
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "ERROR: Node.js not found. Please install Node.js." -ForegroundColor Red
    exit 1
}

Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Extract/read the SQL backup file" -ForegroundColor Gray
Write-Host "  2. Parse INSERT statements" -ForegroundColor Gray
Write-Host "  3. Convert to TypeScript seed data files" -ForegroundColor Gray
Write-Host "  4. Generate seed functions" -ForegroundColor Gray
Write-Host ""

# Create output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# Create a Node.js script to do the conversion
$converterScript = @'
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const backupFile = process.argv[2];
const outputDir = process.argv[3];

console.log('Reading backup file...');

let sqlContent;
if (backupFile.endsWith('.gz')) {
    const compressed = fs.readFileSync(backupFile);
    sqlContent = zlib.gunzipSync(compressed).toString('utf8');
} else {
    sqlContent = fs.readFileSync(backupFile, 'utf8');
}

console.log('Parsing SQL (looking for COPY statements)...');

const dataByTable = {};

// Parse COPY statements (PostgreSQL pg_dump format)
const copyRegex = /COPY\s+public\.("?)(\w+)\1\s*\(([^)]+)\)\s+FROM\s+stdin;/gi;
let copyMatch;
let lastIndex = 0;

while ((copyMatch = copyRegex.exec(sqlContent)) !== null) {
    const tableName = copyMatch[2];
    const columns = copyMatch[3].split(',').map(c => c.trim().replace(/"/g, ''));
    
    // Find the data section (between COPY statement and \.)
    const copyEnd = copyMatch.index + copyMatch[0].length;
    const dataStart = sqlContent.indexOf('\n', copyEnd) + 1;
    const dataEnd = sqlContent.indexOf('\n\\.\n', dataStart);
    
    if (dataEnd === -1) {
        console.log('  Warning: Could not find data end for table ' + tableName);
        continue;
    }
    
    const dataSection = sqlContent.substring(dataStart, dataEnd);
    const rows = dataSection.split('\n').filter(line => line.trim() !== '');
    
    if (!dataByTable[tableName]) {
        dataByTable[tableName] = [];
    }
    
    // Parse tab-separated values
    rows.forEach(row => {
        if (!row.trim()) return;
        
        // Split by tab, but handle escaped tabs and newlines
        const values = [];
        let current = '';
        let escaped = false;
        
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (escaped) {
                if (char === 't') current += '\t';
                else if (char === 'n') current += '\n';
                else if (char === 'r') current += '\r';
                else if (char === '\\') current += '\\';
                else current += char;
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === '\t') {
                values.push(current === '\\N' ? null : current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current === '\\N' ? null : current);
        
        // Map values to columns
        const obj = {};
        columns.forEach((col, idx) => {
            let value = values[idx];
            
            // Handle NULL
            if (value === null || value === '\\N' || value === undefined) {
                obj[col] = null;
            } else {
                // Try to parse numbers and booleans
                if (value === 'true') obj[col] = true;
                else if (value === 'false') obj[col] = false;
                else if (/^-?\d+$/.test(value)) obj[col] = parseInt(value, 10);
                else if (/^-?\d*\.\d+$/.test(value)) obj[col] = parseFloat(value);
                else obj[col] = value;
            }
        });
        
        dataByTable[tableName].push(obj);
    });
    
    console.log('  Parsed ' + rows.length + ' rows for table ' + tableName);
}

const tableCount = Object.keys(dataByTable).length;
console.log('\nFound data for ' + tableCount + ' tables');

// Generate TypeScript files for each table
Object.keys(dataByTable).forEach(tableName => {
    const data = dataByTable[tableName];
    const pascalName = tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    const tsContent = 'export const ' + pascalName + 'SeedData = ' + JSON.stringify(data, null, 2) + ';\n';
    
    const outputFile = path.join(outputDir, tableName + '.ts');
    fs.writeFileSync(outputFile, tsContent, 'utf8');
    console.log('  ✓ ' + tableName + ': ' + data.length + ' rows -> ' + outputFile);
});

console.log('');
console.log('Conversion complete!');
console.log('Output directory: ' + outputDir);
'@

$converterFile = [System.IO.Path]::GetTempFileName() + ".js"
$converterScript | Out-File -FilePath $converterFile -Encoding UTF8 -NoNewline

try {
    Write-Host "Running conversion..." -ForegroundColor Cyan
    node $converterFile $BackupFile $OutputDir
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] Backup converted to seed data!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Review the generated files in: $OutputDir" -ForegroundColor Gray
        Write-Host "  2. Integrate them into prisma/seed.ts" -ForegroundColor Gray
        Write-Host "  3. Run: pnpm tsx prisma/seed.ts" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "[ERROR] Conversion failed" -ForegroundColor Red
        exit 1
    }
} finally {
    Remove-Item $converterFile -ErrorAction SilentlyContinue
}
