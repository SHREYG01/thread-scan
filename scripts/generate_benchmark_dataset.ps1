# ==============================================================================
# THREAD//SCAN - Deterministic Benchmark Dataset Generator
# Target: C:\thread-scan-benchmark (~500 files, ~100 duplicate clusters, ~120 MB)
# Fully reproducible, zero personal data, safe outside workspace.
# ==============================================================================

param (
    [string]$TargetDir = "C:\thread-scan-benchmark"
)

Write-Host "Creating benchmark dataset at: $TargetDir" -ForegroundColor Cyan

# 1. Clean previous benchmark dataset if present
if (Test-Path $TargetDir) {
    Write-Host "Removing existing directory..." -ForegroundColor Yellow
    Remove-Item -Path $TargetDir -Recurse -Force
}

New-Item -ItemType Directory -Path "$TargetDir\unique_data" -Force | Out-Null
New-Item -ItemType Directory -Path "$TargetDir\group_alpha" -Force | Out-Null
New-Item -ItemType Directory -Path "$TargetDir\group_beta" -Force | Out-Null
New-Item -ItemType Directory -Path "$TargetDir\group_gamma" -Force | Out-Null
New-Item -ItemType Directory -Path "$TargetDir\backups\nested" -Force | Out-Null

# Deterministic buffer generator
function Get-DeterministicBuffer([int]$size, [byte]$seed) {
    $buf = New-Object byte[] $size
    for ($i = 0; $i -lt $size; $i++) {
        $buf[$i] = [byte](($i * 31 + $seed) % 256)
    }
    return $buf
}

$fileCount = 0
$totalBytes = 0

Write-Host "Generating 200 unique files..." -ForegroundColor Gray
# 200 Unique files (each file has unique size and content)
for ($i = 1; $i -le 200; $i++) {
    $size = 1024 + ($i * 791) % (128 * 1024) # 1 KB to 128 KB unique sizes
    $buf = Get-DeterministicBuffer $size ([byte]($i % 250 + 1))
    $filePath = "$TargetDir\unique_data\unique_payload_$($i.ToString('000')).bin"
    [System.IO.File]::WriteAllBytes($filePath, $buf)
    $fileCount++
    $totalBytes += $size
}

Write-Host "Generating 100 duplicate groups (300 duplicate files)..." -ForegroundColor Gray

# Group sizes and distribution:
# 70 pairs (140 files)
# 20 trios (60 files)
# 10 sets of 10 (100 files)
# Total = 100 groups, 300 files

$groupIndex = 1

# 1. 70 Pairs (2 copies each -> 140 files)
for ($g = 1; $g -le 70; $g++) {
    $baseSize = if ($g -le 30) {
        # Small: 4 KB - 32 KB
        4096 + ($g * 1117) % (28 * 1024)
    } elseif ($g -le 60) {
        # Medium: 64 KB - 512 KB
        65536 + ($g * 13337) % (400 * 1024)
    } else {
        # Larger: 1 MB - 2.5 MB
        1048576 + ($g * 104729) % (1500 * 1024)
    }
    
    $buf = Get-DeterministicBuffer $baseSize ([byte](($groupIndex * 17) % 250 + 1))
    
    $f1 = "$TargetDir\group_alpha\cluster_$($groupIndex.ToString('000'))_copyA.dat"
    $f2 = "$TargetDir\group_beta\cluster_$($groupIndex.ToString('000'))_copyB.dat"
    
    [System.IO.File]::WriteAllBytes($f1, $buf)
    [System.IO.File]::WriteAllBytes($f2, $buf)
    
    $fileCount += 2
    $totalBytes += ($baseSize * 2)
    $groupIndex++
}

# 2. 20 Trios (3 copies each -> 60 files)
for ($g = 1; $g -le 20; $g++) {
    $baseSize = 32768 + ($g * 65536) # 32 KB to ~1.3 MB
    $buf = Get-DeterministicBuffer $baseSize ([byte](($groupIndex * 23) % 250 + 1))
    
    $f1 = "$TargetDir\group_alpha\cluster_$($groupIndex.ToString('000'))_replica_1.bin"
    $f2 = "$TargetDir\group_beta\cluster_$($groupIndex.ToString('000'))_replica_2.bin"
    $f3 = "$TargetDir\backups\nested\cluster_$($groupIndex.ToString('000'))_replica_3.bin"
    
    [System.IO.File]::WriteAllBytes($f1, $buf)
    [System.IO.File]::WriteAllBytes($f2, $buf)
    [System.IO.File]::WriteAllBytes($f3, $buf)
    
    $fileCount += 3
    $totalBytes += ($baseSize * 3)
    $groupIndex++
}

# 3. 10 Sets of 10 (10 copies each -> 100 files)
for ($g = 1; $g -le 10; $g++) {
    $baseSize = 65536 + ($g * 48000) # 64 KB to ~500 KB
    $buf = Get-DeterministicBuffer $baseSize ([byte](($groupIndex * 37) % 250 + 1))
    
    for ($c = 1; $c -le 10; $c++) {
        $folder = if ($c % 3 -eq 0) { "$TargetDir\group_gamma" } elseif ($c % 2 -eq 0) { "$TargetDir\group_beta" } else { "$TargetDir\backups\nested" }
        $f = "$folder\cluster_$($groupIndex.ToString('000'))_inst_$($c.ToString('00')).blob"
        [System.IO.File]::WriteAllBytes($f, $buf)
        $fileCount++
        $totalBytes += $baseSize
    }
    $groupIndex++
}

$totalMB = [math]::Round($totalBytes / (1024 * 1024), 2)
Write-Host "Benchmark dataset generated successfully!" -ForegroundColor Green
Write-Host "  Location:         $TargetDir"
Write-Host "  Total Files:      $fileCount (199 unique + 301 duplicates across 100 groups)"
Write-Host "  Total Data:       $totalMB MB ($totalBytes bytes)"
Write-Host "  Candidate Files:  302 files hashed (301 true duplicates + 1 unique file size-collision)"
