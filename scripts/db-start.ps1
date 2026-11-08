# Starts the local portable PostgreSQL instance.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root '.local\pgsql\bin'
$data = Join-Path $root '.local\pgdata'
$log = Join-Path $data 'postgres.log'

if (-not (Test-Path (Join-Path $bin 'pg_ctl.exe'))) {
    throw "PostgreSQL portable no encontrado en $bin. Ejecuta scripts/db-init.ps1."
}
if (-not (Test-Path $data)) {
    throw "Data directory no encontrado en $data. Ejecuta scripts/db-init.ps1."
}

& (Join-Path $bin 'pg_ctl.exe') -D $data status *> $null
if ($LASTEXITCODE -eq 0) {
    Write-Host "PostgreSQL ya esta en ejecucion."
    exit 0
}

Write-Host "Iniciando PostgreSQL portable..."
Start-Process -FilePath (Join-Path $bin 'pg_ctl.exe') `
    -ArgumentList @('-D', $data, '-l', $log, 'start') `
    -WindowStyle Hidden | Out-Null

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    & (Join-Path $bin 'pg_isready.exe') -h 127.0.0.1 -p 55432 *> $null
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
    }
}

if (-not $ready) {
    Write-Error "PostgreSQL no respondio. Revisa $log"
    exit 1
}

Write-Host "PostgreSQL listo en 127.0.0.1:55432"
