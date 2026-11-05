Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap ((Resolve-Path 'public/assets/devices/muse-device.jpg').Path)

Write-Host "Muse exact bounds:"
Write-Host "Left search at y=200:"
for ($x = 40; $x -le 80; $x += 2) {
    $c = $bmp.GetPixel($x, 200)
    Write-Host "x=$x : R=$($c.R) G=$($c.G) B=$($c.B)"
}

Write-Host "Right search at y=200:"
for ($x = 220; $x -le 260; $x += 2) {
    $c = $bmp.GetPixel($x, 200)
    Write-Host "x=$x : R=$($c.R) G=$($c.G) B=$($c.B)"
}

Write-Host "Top search at x=150:"
for ($y = 80; $y -le 140; $y += 3) {
    $c = $bmp.GetPixel(150, $y)
    Write-Host "y=$y : R=$($c.R) G=$($c.G) B=$($c.B)"
}

Write-Host "Bottom search at x=150:"
for ($y = 230; $y -le 290; $y += 3) {
    $c = $bmp.GetPixel(150, $y)
    Write-Host "y=$y : R=$($c.R) G=$($c.G) B=$($c.B)"
}
$bmp.Dispose()

