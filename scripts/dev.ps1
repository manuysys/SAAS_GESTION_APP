# Starts the API and web dev servers in separate PowerShell windows.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$api = Join-Path $root 'apps\api'
$web = Join-Path $root 'apps\web'

if (-not (Test-Path (Join-Path $api 'pyproject.toml'))) {
    throw "apps/api no existe todavia."
}
if (-not (Test-Path (Join-Path $web 'package.json'))) {
    throw "apps/web no existe todavia."
}

& (Join-Path $PSScriptRoot 'db-start.ps1')

Start-Process powershell.exe -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$api'; uv run uvicorn app.main:app --reload --port 8000"
)

Start-Process powershell.exe -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$web'; pnpm dev"
)

Write-Host "API: http://localhost:8000/docs"
Write-Host "Web: http://localhost:3000"
