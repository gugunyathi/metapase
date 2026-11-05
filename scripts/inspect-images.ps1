Add-Type -AssemblyName System.Drawing

function Check-Car {
    $bmp = New-Object System.Drawing.Bitmap ((Resolve-Path 'public/assets/devices/car-device.jpg').Path)
    Write-Host "Car width: $($bmp.Width), height: $($bmp.Height)"
    
    # scan horizontally at y=150
    for ($x = 0; $x -lt $bmp.Width; $x += 10) {
        $c = $bmp.GetPixel($x, 150)
        if ($c.R -lt 25 -and $c.G -lt 25 -and $c.B -lt 30) {
            # dark screen
        }
    }
    
    # Let's find bounding box of the central screen
    # Left edge: scan x from 100 to 250 at y=200
    for ($x = 100; $x -lt 250; $x++) {
        $c = $bmp.GetPixel($x, 200)
        # the dashboard is textured grey/light, screen bezel is black
        if ($c.R -lt 20 -and $c.G -lt 25 -and $c.B -lt 35) {
            Write-Host "Screen left edge around x=$x"
            break
        }
    }

    # Right edge: scan x from 800 down to 600 at y=200
    for ($x = 800; $x -gt 600; $x--) {
        $c = $bmp.GetPixel($x, 200)
        if ($c.R -lt 20 -and $c.G -lt 25 -and $c.B -lt 35) {
            Write-Host "Screen right edge around x=$x"
            break
        }
    }

    # Top edge: scan y from 0 to 50 at x=440
    for ($y = 0; $y -lt 60; $y++) {
        $c = $bmp.GetPixel(440, $y)
        if ($c.R -lt 20 -and $c.G -lt 25 -and $c.B -lt 35) {
            Write-Host "Screen top edge around y=$y"
            break
        }
    }

    # Bottom edge: scan y from 400 down to 250 at x=440
    for ($y = 380; $y -gt 250; $y--) {
        $c = $bmp.GetPixel(440, $y)
        if ($c.R -lt 20 -and $c.G -lt 25 -and $c.B -lt 35) {
            Write-Host "Screen bottom edge around y=$y"
            break
        }
    }

    $bmp.Dispose()
}

function Check-Muse {
    $bmp = New-Object System.Drawing.Bitmap ((Resolve-Path 'public/assets/devices/muse-device.jpg').Path)
    Write-Host "Muse width: $($bmp.Width), height: $($bmp.Height)"
    
    # Left edge around y=180
    for ($x = 10; $x -lt 150; $x++) {
        $c = $bmp.GetPixel($x, 180)
        if ($c.R -lt 25 -and $c.G -lt 25 -and $c.B -lt 35) {
            Write-Host "Muse screen left around x=$x"
            break
        }
    }

    # Right edge around y=180
    for ($x = 280; $x -gt 150; $x--) {
        $c = $bmp.GetPixel($x, 180)
        if ($c.R -lt 25 -and $c.G -lt 25 -and $c.B -lt 35) {
            Write-Host "Muse screen right around x=$x"
            break
        }
    }

    # Top edge around x=150
    for ($y = 10; $y -lt 150; $y++) {
        $c = $bmp.GetPixel(150, $y)
        if ($c.R -lt 25 -and $c.G -lt 25 -and $c.B -lt 35) {
            Write-Host "Muse screen top around y=$y"
            break
        }
    }

    # Bottom edge around x=150
    for ($y = 350; $y -gt 150; $y--) {
        $c = $bmp.GetPixel(150, $y)
        if ($c.R -lt 25 -and $c.G -lt 25 -and $c.B -lt 35) {
            Write-Host "Muse screen bottom around y=$y"
            break
        }
    }

    $bmp.Dispose()
}

Check-Car
Check-Muse

