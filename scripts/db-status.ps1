# Shows the local PostgreSQL status.
$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root '.local\pgsql\bin'
$data = Join-Path $root '.local\pgdata'

& (Join-Path $bin 'pg_ctl.exe') -D $data status
& (Join-Path $bin 'pg_isready.exe') -h 127.0.0.1 -p 55432
