$path = 'everest-frontend\src\components\AdminDashboard.jsx'
$lines = [System.IO.File]::ReadAllLines($path)

# Lines are 0-indexed; the problematic lines in file are 5697 and 5700 (1-indexed)
# Line index 5696 = {cadViewport.width <= 1500 && (   (main map FMB, no guard)
# Line index 5699 = {cadViewport.width <= 6000 && (   (main map Cadastral, no guard)

$l5696 = $lines[5696].Trim()
$l5699 = $lines[5699].Trim()

Write-Host "Line 5697 (idx 5696): '$l5696'"
Write-Host "Line 5700 (idx 5699): '$l5699'"

if ($l5696 -eq '{cadViewport.width <= 1500 && (') {
    $lines[5696] = '                            {isFMBEnabled && cadViewport.width <= 1500 && ('
    Write-Host "Patched line 5697 (FMB guard)"
} else {
    Write-Host "WARNING: line 5697 content unexpected"
}

if ($l5699 -eq '{cadViewport.width <= 6000 && (') {
    $lines[5699] = '                            {isCadastralEnabled && cadViewport.width <= 6000 && ('
    Write-Host "Patched line 5700 (Cadastral guard)"
} else {
    Write-Host "WARNING: line 5700 content unexpected"
}

[System.IO.File]::WriteAllLines($path, $lines, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done."
