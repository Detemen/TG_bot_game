param(
    [string]$npm
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $repoRoot "frontend"

Write-Host "[INFO] Repository root: $repoRoot"
Write-Host "[INFO] Frontend directory: $frontendDir"

if (-not (Test-Path $frontendDir)) {
    Write-Error "Frontend directory not found. Expected: $frontendDir"
    Read-Host "Press Enter to close"
    exit 1
}

Set-Location $frontendDir

$npmPath = $npm
Write-Host "[INFO] npm detected at $npmPath"

$nodeDir = Split-Path $npmPath -Parent
if (-not (($env:PATH -split ';') -contains $nodeDir)) {
    $env:PATH = "$nodeDir;$env:PATH"
    Write-Host "[INFO] Temporarily added $nodeDir to PATH for this session."
}

$needsInstall = $true
if ((Test-Path "node_modules") -and (Test-Path "node_modules/vite")) {
    $needsInstall = $false
}

if ($needsInstall) {
    Write-Host "[INFO] Installing dependencies (npm install)..."
    & "$npmPath" install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm install завершився з помилкою ($LASTEXITCODE)."
        Read-Host "Press Enter to close"
        exit $LASTEXITCODE
    }
}

Write-Host "[INFO] Starting Vite dev server at http://localhost:5173 (LAN available)."
Write-Host "[INFO] Використовуйте CTRL+C для зупинки."

& "$npmPath" run dev -- --host 0.0.0.0 --port 5173
$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "[INFO] Dev server завершено."
} else {
    Write-Host "[WARN] npm run dev завершився з кодом $exitCode."
}
Read-Host "Натисніть Enter, щоб закрити вікно"
exit $exitCode
