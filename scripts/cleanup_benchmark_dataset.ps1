# ==============================================================================
# THREAD//SCAN - Benchmark Dataset Cleanup Script
# Safely removes ONLY the generated test directory C:\thread-scan-benchmark
# ==============================================================================

param (
    [string]$TargetDir = "C:\thread-scan-benchmark"
)

# Safety check: ONLY allow deletion of the specific benchmark directory
if ($TargetDir -ne "C:\thread-scan-benchmark") {
    Write-Error "Safety abort: This script only removes C:\thread-scan-benchmark"
    exit 1
}

if (Test-Path $TargetDir) {
    Write-Host "Removing benchmark dataset at: $TargetDir" -ForegroundColor Yellow
    Remove-Item -Path $TargetDir -Recurse -Force
    Write-Host "Cleanup completed successfully." -ForegroundColor Green
} else {
    Write-Host "Directory $TargetDir does not exist. Nothing to clean." -ForegroundColor Gray
}
