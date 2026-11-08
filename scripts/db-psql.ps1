# Opens psql against the local development database.
param(
    [string]$Database = 'saas_gestion_dev',
    [string]$User = 'saas',
    [string]$Password = 'saas_dev_password'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root '.local\pgsql\bin'
$env:PGPASSWORD = $Password

& (Join-Path $bin 'psql.exe') -h 127.0.0.1 -p 55432 -U $User -d $Database
