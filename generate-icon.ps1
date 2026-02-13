Add-Type -AssemblyName System.Drawing
$imagePath = 'H:\sandouq-fatwa-main\sandouq-fatwa-main\src\assets\mosque-hero.jpg'
$outputPath = 'H:\sandouq-fatwa-main\sandouq-fatwa-main\public\icon-mosque.png'

try {
    $img = [System.Drawing.Image]::FromFile($imagePath)
    $min = [Math]::Min($img.Width, $img.Height)
    
    # Create a square bitmap of the original aspect ratio's minimum dimension
    $bmp = New-Object System.Drawing.Bitmap $min, $min
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # Crop to center
    $srcRect = New-Object System.Drawing.Rectangle (($img.Width - $min) / 2), (($img.Height - $min) / 2), $min, $min
    $destRect = New-Object System.Drawing.Rectangle 0, 0, $min, $min
    $g.DrawImage($img, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    
    # Resize to 512x512
    $finalBmp = New-Object System.Drawing.Bitmap 512, 512
    $finalG = [System.Drawing.Graphics]::FromImage($finalBmp)
    $finalG.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $finalG.DrawImage($bmp, 0, 0, 512, 512)
    
    $finalBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $finalG.Dispose()
    $finalBmp.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    $img.Dispose()
    Write-Host "Success: Icon saved to $outputPath"
} catch {
    Write-Error "Failed to generate icon: $($_.Exception.Message)"
}
