# Marble Race - Dev Launcher
# Starts backend + frontend in separate terminals

Write-Host "=== Marble Race Dev Launcher ===" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js not found. Install it first." -ForegroundColor Red
    exit 1
}

# Start backend
Write-Host "[1/2] Starting backend (port 4000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\PY\TG_bot_game\backend'; npm run dev"

# Wait a moment for backend to initialize
Start-Sleep -Seconds 2

# Start frontend
Write-Host "[2/2] Starting frontend (port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\PY\TG_bot_game\frontend'; npm run dev"

Write-Host ""
Write-Host "=== Both services starting ===" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:4000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "For Telegram testing, run in another terminal:" -ForegroundColor Magenta
Write-Host "  cloudflared tunnel --url http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Then set the tunnel URL as your Bot's WebApp URL in @BotFather" -ForegroundColor Magenta
