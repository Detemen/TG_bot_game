@echo off
chcp 65001 >nul
echo.
echo 🔍 Визначення вашої локальної IP адреси...
echo.

REM Отримати IPv4 адресу
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    set IP=!IP: =!
    echo ✅ Ваша IP адреса: !IP!
    echo.
)

echo 📝 Оновіть frontend/.env:
echo.
echo VITE_API_URL=http://!IP!:4000
echo VITE_API_BASE_URL=http://!IP!:4000
echo VITE_WS_BASE_URL=ws://!IP!:4000
echo VITE_DEV_MODE=true
echo.
echo.

echo 🔗 URLs для тестування:
echo.
echo На цьому ПК:
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:4000
echo.
echo З іншого пристрою (телефон, планшет):
echo   Frontend: http://!IP!:5173
echo   Backend:  http://!IP!:4000
echo.
echo.

echo 🔥 Відкрийте порти у Firewall:
echo.
echo PowerShell (від адміністратора):
echo   New-NetFirewallRule -DisplayName "Marble Race" -Direction Inbound -LocalPort 4000,5173 -Protocol TCP -Action Allow
echo.

pause
