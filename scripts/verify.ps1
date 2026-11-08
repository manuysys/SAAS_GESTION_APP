# Verifies the local toolchain and, when present, the application checks.
$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent $PSScriptRoot
$failures = @()

function Check-Command($name, $command) {
    $cmd = Get-Command $command -ErrorAction SilentlyContinue
    if ($cmd) {
        Write-Host "[OK] $name -> $($cmd.Source)"
    } else {
        Write-Host "[FAIL] $name no encontrado ($command)"
        $script:failures += $name
    }
}

Write-Host "=== Toolchain ==="
Check-Command 'git' 'git'
Check-Command 'node' 'node'
Check-Command 'pnpm' 'pnpm'
Check-Command 'python' 'python'
Check-Command 'uv' 'uv'

$fnm = Get-Command fnm -ErrorAction SilentlyContinue
if ($fnm) {
    Write-Host "--- Node via fnm ---"
    & $fnm.Source exec --using=24 -- node --version
}

Write-Host ""
Write-Host "=== PostgreSQL ==="
$pgIsReady = Join-Path $root '.local\pgsql\bin\pg_isready.exe'
if (Test-Path $pgIsReady) {
    & $pgIsReady -h 127.0.0.1 -p 55432
    if ($LASTEXITCODE -ne 0) { $failures += 'postgres' }
} else {
    Write-Host "[FAIL] PostgreSQL portable no instalado"
    $failures += 'postgres'
}

Write-Host ""
Write-Host "=== Backend ==="
$api = Join-Path $root 'apps\api'
if (Test-Path (Join-Path $api 'pyproject.toml')) {
    Push-Location $api
    uv run ruff check .
    if ($LASTEXITCODE -ne 0) { $failures += 'ruff' }
    uv run ruff format --check .
    if ($LASTEXITCODE -ne 0) { $failures += 'ruff-format' }
    uv run basedpyright
    if ($LASTEXITCODE -ne 0) { $failures += 'basedpyright' }
    uv run pytest -q
    if ($LASTEXITCODE -ne 0) { $failures += 'pytest' }
    Pop-Location
} else {
    Write-Host "[SKIP] apps/api aun no existe"
}

Write-Host ""
Write-Host "=== Frontend ==="
$web = Join-Path $root 'apps\web'
if (Test-Path (Join-Path $web 'package.json')) {
    Push-Location $web
    pnpm lint
    if ($LASTEXITCODE -ne 0) { $failures += 'eslint' }
    pnpm typecheck
    if ($LASTEXITCODE -ne 0) { $failures += 'tsc' }
    pnpm test -- --run
    if ($LASTEXITCODE -ne 0) { $failures += 'vitest' }
    pnpm build
    if ($LASTEXITCODE -ne 0) { $failures += 'next-build' }
    Pop-Location
} else {
    Write-Host "[SKIP] apps/web aun no existe"
}

Write-Host ""
if ($failures.Count -gt 0) {
    Write-Host "FALLOS: $($failures -join ', ')"
    exit 1
}
Write-Host "Todo OK."
