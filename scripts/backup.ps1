# Creates a custom-format backup of the local PostgreSQL database.
param(
    [string]$Database = 'saas_gestion_dev',
    [string]$User = 'saas',
    [string]$Password = 'saas_dev_password'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root '.local\pgsql\bin'
$backupDir = Join-Path $root '.local\backups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$out = Join-Path $backupDir "saas_gestion_$timestamp.dump"
$env:PGPASSWORD = $Password

& (Join-Path $bin 'pg_dump.exe') `
    --host=127.0.0.1 `
    --port=55432 `
    --username=$User `
    --dbname=$Database `
    --format=custom `
    --no-owner `
    --file=$out

if ($LASTEXITCODE -ne 0) {
    throw "pg_dump fallo con codigo $LASTEXITCODE"
}

Write-Host "Backup creado: $out"
