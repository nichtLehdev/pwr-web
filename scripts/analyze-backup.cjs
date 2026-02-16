const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const backupFile = process.argv[2] || '../../backup.sql.gz';

console.log('Analyzing backup file:', backupFile);

let sqlContent;
if (backupFile.endsWith('.gz')) {
    const compressed = fs.readFileSync(backupFile);
    sqlContent = zlib.gunzipSync(compressed).toString('utf8');
} else {
    sqlContent = fs.readFileSync(backupFile, 'utf8');
}

console.log('File size:', sqlContent.length, 'characters');

// Check for COPY statements
const copyMatches = sqlContent.matchAll(/COPY\s+public\.("?\w+"?)\s*\(([^)]+)\)\s+FROM\s+stdin;/gi);
const copyTables = [];
for (const match of copyMatches) {
    copyTables.push({ table: match[1].replace(/"/g, ''), columns: match[2] });
}

if (copyTables.length > 0) {
    console.log('\nFound', copyTables.length, 'COPY statements');
    console.log('First 5 tables:', copyTables.slice(0, 5).map(t => t.table).join(', '));
    
    // Find data for first table
    const firstTable = copyTables[0].table;
    const firstCopyIdx = sqlContent.indexOf(`COPY public."${firstTable}"`);
    if (firstCopyIdx !== -1) {
        const dataStart = sqlContent.indexOf('\n', firstCopyIdx) + 1;
        const dataEnd = sqlContent.indexOf('\n\\.\n', dataStart);
        if (dataEnd !== -1) {
            const sampleData = sqlContent.substring(dataStart, Math.min(dataStart + 500, dataEnd));
            console.log('\nSample data for', firstTable + ':');
            console.log(sampleData);
        }
    }
} else {
    // Check for INSERT statements
    const insertMatches = sqlContent.match(/INSERT\s+INTO/gi);
    if (insertMatches) {
        console.log('\nFound', insertMatches.length, 'INSERT statements');
        const firstInsertIdx = sqlContent.indexOf('INSERT');
        console.log('Sample:', sqlContent.substring(firstInsertIdx, firstInsertIdx + 500));
    } else {
        console.log('\nNo COPY or INSERT statements found');
    }
}
