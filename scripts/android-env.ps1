# Sets Android SDK/JDK environment variables for local builds.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$sdk = Join-Path $root '.local\android-sdk'

if (-not (Test-Path $sdk)) {
    throw "Android SDK no encontrado en $sdk. Ejecutá .local\install-android-sdk.ps1."
}

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:JAVA_HOME = (Get-Command java).Source | Split-Path -Parent | Split-Path -Parent
$env:Path = "$sdk\platform-tools;$sdk\cmdline-tools\latest\bin;$env:JAVA_HOME\bin;$env:Path"

Write-Host "ANDROID_HOME=$env:ANDROID_HOME"
Write-Host "JAVA_HOME=$env:JAVA_HOME"
