# Checks local API, web and PostgreSQL health.
$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent $PSScriptRoot
$failures = @()

function Check-Url($name, $url) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
            Write-Host "[OK] $name -> $($response.StatusCode)"
        } else {
            Write-Host "[FAIL] $name -> $($response.StatusCode)"
            $script:failures += $name
        }
    } catch {
        Write-Host "[FAIL] $name -> $($_.Exception.Message)"
        $script:failures += $name
    }
}

Check-Url 'API live' 'http://127.0.0.1:8000/api/v1/health/live'
Check-Url 'API ready' 'http://127.0.0.1:8000/api/v1/health/ready'
Check-Url 'Web' 'http://127.0.0.1:3000/login'

$pgIsReady = Join-Path $root '.local\pgsql\bin\pg_isready.exe'
if (Test-Path $pgIsReady) {
    & $pgIsReady -h 127.0.0.1 -p 55432
    if ($LASTEXITCODE -ne 0) { $failures += 'postgres' }
} else {
    Write-Host '[FAIL] PostgreSQL portable no instalado'
    $failures += 'postgres'
}

if ($failures.Count -gt 0) {
    Write-Host "FALLOS: $($failures -join ', ')"
    exit 1
}

Write-Host 'Healthcheck OK.'
