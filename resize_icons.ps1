
Add-Type -AssemblyName System.Drawing
$logoPath = "e:\Omegle\public\logo.png"
$iconsDir = "e:\Omegle\public\icons"

if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir
}

function Resize-Image {
    param (
        [string]$SourcePath,
        [string]$DestinationPath,
        [int]$Width,
        [int]$Height
    )
    $src = [System.Drawing.Image]::FromFile($SourcePath)
    $dest = New-Object System.Drawing.Bitmap($Width, $Height)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($src, 0, 0, $Width, $Height)
    $dest.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $dest.Dispose()
    $src.Dispose()
}

$sizes = @(
    @{ Name = "favicon-16x16.png"; Size = 16 },
    @{ Name = "favicon-32x32.png"; Size = 32 },
    @{ Name = "favicon-64x64.png"; Size = 64 },
    @{ Name = "apple-touch-icon.png"; Size = 180 },
    @{ Name = "android-chrome-512x512.png"; Size = 512 }
)

foreach ($item in $sizes) {
    $destPath = Join-Path $iconsDir $item.Name
    Resize-Image -SourcePath $logoPath -DestinationPath $destPath -Width $item.Size -Height $item.Size
    Write-Host "Created $destPath"
}
