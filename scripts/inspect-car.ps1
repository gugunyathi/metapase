Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap ((Resolve-Path 'public/assets/devices/car-device.jpg').Path)

Write-Host "Left border search:"
for ($x = 130; $x -le 190; $x += 5) {
    $c = $bmp.GetPixel($x, 150)
    Write-Host "x=$x : R=$($c.R) G=$($c.G) B=$($c.B)"
}

Write-Host "Right border search:"
for ($x = 690; $x -le 740; $x += 5) {
    $c = $bmp.GetPixel($x, 150)
    Write-Host "x=$x : R=$($c.R) G=$($c.G) B=$($c.B)"
}

Write-Host "Top border search:"
for ($y = 0; $y -le 30; $y += 3) {
    $c = $bmp.GetPixel(440, $y)
    Write-Host "y=$y : R=$($c.R) G=$($c.G) B=$($c.B)"
}

Write-Host "Bottom border search:"
for ($y = 290; $y -le 340; $y += 3) {
    $c = $bmp.GetPixel(440, $y)
    Write-Host "y=$y : R=$($c.R) G=$($c.G) B=$($c.B)"
}
$bmp.Dispose()

