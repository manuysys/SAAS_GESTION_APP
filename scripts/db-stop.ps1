# Stops the local portable PostgreSQL instance.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root '.local\pgsql\bin'
$data = Join-Path $root '.local\pgdata'

if (-not (Test-Path (Join-Path $bin 'pg_ctl.exe'))) {
    throw "PostgreSQL portable no encontrado en $bin."
}

& (Join-Path $bin 'pg_ctl.exe') -D $data stop -m fast
Write-Host "PostgreSQL detenido."
