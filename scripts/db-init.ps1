# Initializes the local portable PostgreSQL instance (download, initdb, role, databases).
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$local = Join-Path $root '.local'
$bin = Join-Path $local 'pgsql\bin'
$data = Join-Path $local 'pgdata'
$cache = Join-Path $local 'cache'
$zip = Join-Path $cache 'postgresql-17.11-5-windows-x64-binaries.zip'
$url = 'https://get.enterprisedb.com/postgresql/postgresql-17.11-5-windows-x64-binaries.zip'
$pgPassword = 'postgres_dev_password'
$appPassword = 'saas_dev_password'

New-Item -ItemType Directory -Force -Path $local, $cache | Out-Null

if (-not (Test-Path (Join-Path $bin 'pg_ctl.exe'))) {
    if (-not (Test-Path $zip)) {
        Write-Host "Descargando PostgreSQL 17.11 portable..."
        if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
            & curl.exe -L -C - -o $zip $url
        } else {
            Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
        }
    }
    Write-Host "Extrayendo PostgreSQL..."
    if (Test-Path (Join-Path $local 'pgsql')) {
        Remove-Item (Join-Path $local 'pgsql') -Recurse -Force
    }
    & tar.exe -xf $zip -C $local
}

if (-not (Test-Path (Join-Path $data 'PG_VERSION'))) {
    Write-Host "Inicializando cluster..."
    New-Item -ItemType Directory -Force -Path $data | Out-Null
    $pwFile = Join-Path $local 'pgpass.txt'
    Set-Content -Path $pwFile -Value $pgPassword -NoNewline -Encoding ASCII
    & (Join-Path $bin 'initdb.exe') -D $data -U postgres -A scram-sha-256 --pwfile=$pwFile --encoding=UTF8 --locale=C
    Add-Content -Path (Join-Path $data 'postgresql.conf') -Value "`n# Proyecto SaaS Gestion - configuracion local`nport = 55432`nlisten_addresses = 'localhost'`ntimezone = 'UTC'`nlog_timezone = 'UTC'`n"
}

& (Join-Path $PSScriptRoot 'db-start.ps1')

$env:PGPASSWORD = $pgPassword
$psql = Join-Path $bin 'psql.exe'
$createdb = Join-Path $bin 'createdb.exe'

$roleSql = @'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'saas') THEN
    CREATE ROLE saas LOGIN PASSWORD 'saas_dev_password';
  END IF;
END
$$;
'@

& $psql -h 127.0.0.1 -p 55432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c $roleSql

foreach ($db in @('saas_gestion_dev', 'saas_gestion_test')) {
    $exists = & $psql -h 127.0.0.1 -p 55432 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'"
    if ($exists.Trim() -ne '1') {
        & $createdb -h 127.0.0.1 -p 55432 -U postgres -O saas $db
        Write-Host "Base creada: $db"
    } else {
        Write-Host "Base existente: $db"
    }
}

Write-Host ""
Write-Host "PostgreSQL local listo."
Write-Host "Host: 127.0.0.1  Puerto: 55432"
Write-Host "Usuario app: saas  Password: $appPassword"
Write-Host "DB dev: saas_gestion_dev  DB test: saas_gestion_test"
