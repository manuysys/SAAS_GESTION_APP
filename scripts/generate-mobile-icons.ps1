# Generates the DOVEXO icon set (letter mark) with System.Drawing.
# No external dependencies. Idempotent: running it again produces the same PNGs.
[CmdletBinding()]
param(
    [string]$Letter = 'D',
    [string]$FontFamily = 'Segoe UI',
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$imagesDir = Join-Path $root 'apps\mobile\assets\images'
if (-not (Test-Path $imagesDir)) {
    throw "No se encontro el directorio de imagenes: $imagesDir"
}

$ink = [System.Drawing.Color]::FromArgb(255, 11, 31, 51)      # #0B1F33
$teal = [System.Drawing.Color]::FromArgb(255, 15, 118, 110)   # #0F766E
$white = [System.Drawing.Color]::White
$transparent = [System.Drawing.Color]::Transparent

function New-GlyphBitmap {
    param([string]$Text, [string]$Family, [System.Drawing.Color]$Color, [int]$EmSize = 800)

    $bitmap = [System.Drawing.Bitmap]::new(1200, 1200, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.Clear($transparent)
        $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
        $font = [System.Drawing.Font]::new($Family, [single]$EmSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        try {
            $format = [System.Drawing.StringFormat]::new()
            $format.Alignment = [System.Drawing.StringAlignment]::Center
            $format.LineAlignment = [System.Drawing.StringAlignment]::Center
            $brush = [System.Drawing.SolidBrush]::new($Color)
            try {
                $rect = [System.Drawing.RectangleF]::new(0, 0, 1200, 1200)
                $graphics.DrawString($Text, $font, $brush, $rect, $format)
            } finally { $brush.Dispose() }
        } finally { $font.Dispose() }
    } finally { $graphics.Dispose() }
    return $bitmap
}

function Get-InkBounds {
    param([System.Drawing.Bitmap]$Bitmap)

    $rect = [System.Drawing.Rectangle]::new(0, 0, $Bitmap.Width, $Bitmap.Height)
    $data = $Bitmap.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        $bytes = [byte[]]::new($data.Stride * $data.Height)
        [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
    } finally { $Bitmap.UnlockBits($data) }

    $minX = [int]::MaxValue; $minY = [int]::MaxValue; $maxX = -1; $maxY = -1
    for ($y = 0; $y -lt $Bitmap.Height; $y++) {
        $row = $y * $data.Stride
        for ($x = 0; $x -lt $Bitmap.Width; $x++) {
            $alpha = $bytes[$row + ($x * 4) + 3]
            if ($alpha -gt 8) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if ($maxX -lt 0) { throw 'El glifo quedo vacio: revise -Letter y -FontFamily.' }
    return [pscustomobject]@{
        X = $minX; Y = $minY
        Width = $maxX - $minX + 1
        Height = $maxY - $minY + 1
    }
}

function Save-Icon {
    param(
        [string]$Path,
        [int]$Size,
        [int]$CapHeight,
        [System.Drawing.Color]$Background,
        [System.Drawing.Color]$Foreground
    )

    $glyph = New-GlyphBitmap -Text $Letter -Family $FontFamily -Color $Foreground
    try {
        $bounds = Get-InkBounds -Bitmap $glyph
        $scale = $CapHeight / $bounds.Height
        $drawWidth = $glyph.Width * $scale
        $drawHeight = $glyph.Height * $scale
        $inkCenterX = $bounds.X + ($bounds.Width / 2)
        $inkCenterY = $bounds.Y + ($bounds.Height / 2)
        $destX = ($Size / 2) - ($inkCenterX * $scale)
        $destY = ($Size / 2) - ($inkCenterY * $scale)

        $canvas = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [System.Drawing.Graphics]::FromImage($canvas)
        try {
            $graphics.Clear($Background)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $destRect = [System.Drawing.RectangleF]::new([single]$destX, [single]$destY, [single]$drawWidth, [single]$drawHeight)
            $graphics.DrawImage($glyph, $destRect)
        } finally { $graphics.Dispose() }

        try {
            if (-not $DryRun) { $canvas.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png) }
        } finally { $canvas.Dispose() }
    } finally { $glyph.Dispose() }
}

$targets = @(
    @{ Name = 'icon.png';                    Size = 1024; CapHeight = 292; Background = $ink;         Foreground = $teal },
    @{ Name = 'android-icon-foreground.png'; Size = 1024; CapHeight = 292; Background = $transparent; Foreground = $teal },
    @{ Name = 'splash-icon.png';             Size = 1024; CapHeight = 292; Background = $transparent; Foreground = $teal },
    @{ Name = 'android-icon-monochrome.png'; Size = 1024; CapHeight = 292; Background = $transparent; Foreground = $white }
)

foreach ($target in $targets) {
    $path = Join-Path $imagesDir $target.Name
    Save-Icon -Path $path -Size $target.Size -CapHeight $target.CapHeight -Background $target.Background -Foreground $target.Foreground
    if ($DryRun) {
        Write-Host "[dry-run] $($target.Name)"
    } else {
        $hash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.Substring(0, 12)
        Write-Host ("OK  {0}  {1}x{1}  sha256:{2}" -f $target.Name, $target.Size, $hash)
    }
}

Write-Host "Iconos generados con la letra '$Letter' ($FontFamily)."
Write-Host 'Ejecuta "pnpm exec expo prebuild -p android --clean --no-install" para regenerar android/.'