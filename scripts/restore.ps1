# Restores a custom-format backup into the local PostgreSQL database.
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,
    [string]$Database = 'saas_gestion_dev',
    [string]$User = 'saas',
    [string]$Password = 'saas_dev_password'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $BackupFile)) {
    throw "No existe el backup: $BackupFile"
}

$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root '.local\pgsql\bin'
$env:PGPASSWORD = $Password

& (Join-Path $bin 'pg_restore.exe') `
    --host=127.0.0.1 `
    --port=55432 `
    --username=$User `
    --dbname=$Database `
    --clean `
    --if-exists `
    --no-owner `
    $BackupFile

if ($LASTEXITCODE -ne 0) {
    throw "pg_restore fallo con codigo $LASTEXITCODE"
}

Write-Host "Backup restaurado en $Database"
