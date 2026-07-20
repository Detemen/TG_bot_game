@echo off
cls
echo ============================================================
echo          Marble Race - Complete Startup
echo ============================================================
echo.

echo [1/6] Stopping old processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM ngrok.exe >nul 2>&1
echo Waiting for processes to close...
timeout /t 3 /nobreak >nul

echo [2/6] Generating Prisma Client...
cd /d "%~dp0backend"
call npx prisma generate
if errorlevel 1 (
    echo ERROR: Failed to generate Prisma Client!
    pause
    exit /b 1
)

echo [3/6] Starting Backend Server...
start "Marble Race - Backend" cmd /k "cd /d %~dp0backend && echo Starting Backend Server... && npm run dev"
echo Waiting for backend to initialize...
timeout /t 10 /nobreak >nul

echo [4/6] Starting Frontend Server (Port 5173)...
start "Marble Race - Frontend" cmd /k "cd /d %~dp0frontend && echo Starting Frontend Server on port 5173... && npm run dev -- --port 5173 --strictPort"
echo Waiting for frontend to initialize...
timeout /t 12 /nobreak >nul

echo [5/6] Verifying Frontend Port...
netstat -ano | findstr ":5173" >nul
if errorlevel 1 (
    echo WARNING: Frontend may not be running on port 5173!
    echo Check the Frontend window for the actual port.
    pause
)

echo [6/6] Starting Ngrok Tunnel on port 5173...
cd /d "%~dp0"
start "Marble Race - Ngrok" cmd /k "echo Starting ngrok tunnel... && echo. && .\ngrok.exe http 5173 --log stdout"

timeout /t 5 /nobreak >nul

echo.
echo ============================================================
echo              All Services Started!
echo ============================================================
echo.
echo Three windows are now running:
echo   1. Backend Server (http://localhost:4000)
echo   2. Frontend Server (http://localhost:5173)
echo   3. Ngrok Tunnel (forwarding port 5173)
echo.
echo NEXT STEPS:
echo   1. Look at the Ngrok window and find the HTTPS URL
echo      (looks like: https://xxxxx.ngrok-free.app)
echo.
echo   2. Go to @BotFather in Telegram
echo      - Send /myapps
echo      - Select your bot
echo      - Select "Web App URL"
echo      - Paste the ngrok URL
echo.
echo   3. Open your bot in Telegram and test!
echo.
echo TROUBLESHOOTING:
echo   - Open browser console (F12) to see debug logs
echo   - Check TelegramContext and App debug messages
echo   - If authorization fails, check the debug panel in error screen
echo.
echo Press any key to exit this window (servers will keep running)...
pause >nul
