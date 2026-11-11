# Generates the DOVEXO release keystore used to sign Android App Bundles.
# Secrets are never printed. The keystore lives under .local/ (git-ignored).
[CmdletBinding()]
param(
    [string]$Alias = 'dovexo-release',
    [string]$CommonName = 'DOVEXO',
    [string]$Organization = 'ARVOKTA',
    [string]$OrganizationalUnit = 'Mobile',
    [string]$Country = 'AR',
    [int]$ValidityDays = 10000,
    # Ruta alternativa, util para probar el script sin crear el keystore definitivo.
    [string]$OutFile,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$keystoreDir = Join-Path $root '.local\android-keystore'
$keystorePath = if ($OutFile) { $OutFile } else { Join-Path $keystoreDir 'dovexo-release.keystore' }

function Resolve-Keytool {
    $candidates = @()
    if ($env:JAVA_HOME) { $candidates += (Join-Path $env:JAVA_HOME 'bin\keytool.exe') }
    $cmd = Get-Command keytool -ErrorAction SilentlyContinue
    if ($cmd) { $candidates += $cmd.Source }
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path $candidate)) { return $candidate }
    }
    throw 'No se encontro keytool. Instala un JDK 21 y define JAVA_HOME, o agrega keytool al PATH.'
}

function Read-PlainPassword {
    $secure = Read-Host -AsSecureString 'Contrasena del keystore'
    $confirm = Read-Host -AsSecureString 'Repetir contrasena'
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    $bstr2 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirm)
    $plain2 = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr2)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr2)
    if ($plain -ne $plain2) { throw 'Las contrasenas no coinciden.' }
    if ($plain.Length -lt 16) { throw 'Usa una contrasena de al menos 16 caracteres.' }
    return $plain
}

if ((Test-Path $keystorePath) -and -not $Force) {
    Write-Host "El keystore ya existe: $keystorePath"
    Write-Host 'No se sobrescribe: si lo regeneras, las actualizaciones de Play Store dejan de ser validas.'
    Write-Host 'Usa -Force solo si estas seguro de que no hay ninguna version publicada.'
    exit 0
}

$keytool = Resolve-Keytool
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $keystorePath) | Out-Null

$password = $env:ANDROID_KEYSTORE_PASSWORD
$fromEnv = -not [string]::IsNullOrWhiteSpace($password)
if (-not $fromEnv) {
    $password = Read-PlainPassword
}

$tempVarName = 'DOVEXO_KEYSTORE_PASSWORD_TMP'
[System.Environment]::SetEnvironmentVariable($tempVarName, $password, 'Process')

# keytool escribe progreso en stderr; con ErrorActionPreference Stop eso corta el script.
$previousPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'

try {
    & $keytool -genkeypair `
        -keystore $keystorePath `
        -storetype PKCS12 `
        -alias $Alias `
        -keyalg RSA `
        -keysize 4096 `
        -validity $ValidityDays `
        -dname "CN=$CommonName, OU=$OrganizationalUnit, O=$Organization, C=$Country" `
        "-storepass:env" $tempVarName `
        "-keypass:env" $tempVarName `
        -noprompt 2>&1 | Out-Null

    if ($LASTEXITCODE -ne 0) { throw "keytool fallo con codigo $LASTEXITCODE" }

    Write-Host ''
    Write-Host "Keystore creado: $keystorePath"
    Write-Host "Alias: $Alias"
    Write-Host "Validez: $ValidityDays dias"

    $details = & $keytool -list -v -keystore $keystorePath -alias $Alias "-storepass:env" $tempVarName
    if ($LASTEXITCODE -ne 0) { throw "keytool -list fallo con codigo $LASTEXITCODE" }
    $sha256 = $details | Select-String -Pattern 'SHA256:' | Select-Object -First 1
    if ($sha256) { Write-Host "Huella SHA-256: $($sha256.Line.Trim())" }
} finally {
    $ErrorActionPreference = $previousPreference
    [System.Environment]::SetEnvironmentVariable($tempVarName, $null, 'Process')
    $password = $null
}

Write-Host ''
Write-Host 'Backup obligatorio:'
Write-Host "  1. Copia $keystorePath a un gestor de contrasenas o almacenamiento cifrado fuera del repositorio."
Write-Host '  2. Guarda la contrasena y el alias en el mismo gestor, en una entrada separada.'
Write-Host '  3. Verifica el backup restaurandolo en otra carpeta y corriendo keytool -list sobre la copia.'
Write-Host '  4. Sin este archivo no se pueden publicar actualizaciones de la app en Google Play.'
Write-Host ''
Write-Host 'Para GitHub Actions, codifica el keystore en base64 y guardalo como secreto:'
Write-Host "  [Convert]::ToBase64String([IO.File]::ReadAllBytes(`"$keystorePath`")) | Set-Clipboard"
Write-Host '  Secretos: ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD'
Write-Host ''
Write-Host 'El archivo queda en .local/, que esta excluido por .gitignore. No lo agregues al repositorio.'