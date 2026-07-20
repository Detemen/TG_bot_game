# Скрипт для відкриття портів у Windows Firewall
# Запустіть від імені адміністратора: PowerShell -> Правий клік -> Run as Administrator

Write-Host "🔥 Відкриття портів для Marble Race..." -ForegroundColor Cyan
Write-Host ""

# Перевірка прав адміністратора
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ Потрібні права адміністратора!" -ForegroundColor Red
    Write-Host "Клікніть правою кнопкою на PowerShell та виберіть 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

# Видалити старі правила якщо існують
Write-Host "🧹 Очищення старих правил..." -ForegroundColor Yellow
Remove-NetFirewallRule -DisplayName "Marble Race Backend" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Marble Race Frontend" -ErrorAction SilentlyContinue

# Створити нові правила
Write-Host "➕ Створення правила для Backend (порт 4000)..." -ForegroundColor Green
New-NetFirewallRule -DisplayName "Marble Race Backend" `
    -Direction Inbound `
    -LocalPort 4000 `
    -Protocol TCP `
    -Action Allow `
    -Profile Domain,Private,Public `
    -Description "Дозволяє вхідні підключення до Marble Race Backend API" | Out-Null

Write-Host "➕ Створення правила для Frontend (порт 5173)..." -ForegroundColor Green
New-NetFirewallRule -DisplayName "Marble Race Frontend" `
    -Direction Inbound `
    -LocalPort 5173 `
    -Protocol TCP `
    -Action Allow `
    -Profile Domain,Private,Public `
    -Description "Дозволяє вхідні підключення до Marble Race Frontend Vite dev server" | Out-Null

Write-Host ""
Write-Host "✅ Порти успішно відкриті!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Створені правила:" -ForegroundColor Cyan
Write-Host "  • Marble Race Backend (TCP 4000)" -ForegroundColor White
Write-Host "  • Marble Race Frontend (TCP 5173)" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Перевірити правила:" -ForegroundColor Yellow
Write-Host "  Get-NetFirewallRule -DisplayName 'Marble Race*'" -ForegroundColor Gray
Write-Host ""
Write-Host "🗑️  Видалити правила:" -ForegroundColor Yellow
Write-Host "  Remove-NetFirewallRule -DisplayName 'Marble Race*'" -ForegroundColor Gray
Write-Host ""

# Показати поточну IP адресу
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

if ($ip) {
    Write-Host "🌐 Ваша локальна IP адреса: $ip" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📱 Доступ з інших пристроїв:" -ForegroundColor Green
    Write-Host "  Frontend: http://${ip}:5173" -ForegroundColor White
    Write-Host "  Backend:  http://${ip}:4000" -ForegroundColor White
    Write-Host ""
}

Write-Host "✨ Готово! Тепер інші пристрої у вашій мережі можуть підключитись." -ForegroundColor Green
Write-Host ""

pause
