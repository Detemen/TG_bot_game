# 🏠 Локальне тестування в мережі

Інструкція для запуску Marble Race локально з доступом для інших пристроїв у вашій мережі (Wi-Fi).

## 🚀 Швидкий старт

### Крок 1: Дізнайтесь IP адресу вашого комп'ютера

**Windows:**
```cmd
ipconfig
```
Шукайте рядок "IPv4 Address" (наприклад: `192.168.1.100`)

**Linux/Mac:**
```bash
ifconfig | grep "inet "
# або
ip addr show
```

Ваша локальна IP адреса виглядає як: `192.168.X.X` або `10.0.X.X`

### Крок 2: Оновіть конфігурацію

Припустимо ваша IP адреса: `192.168.1.100`

**1. Backend `.env`** (вже налаштовано правильно):
```env
HOST=0.0.0.0  # Слухає на всіх інтерфейсах ✅
PORT=4000
```

**2. Frontend `.env`:**
```env
VITE_API_URL=http://192.168.1.100:4000
VITE_API_BASE_URL=http://192.168.1.100:4000
VITE_WS_BASE_URL=ws://192.168.1.100:4000
VITE_DEV_MODE=true
```
⚠️ **Замініть `192.168.1.100` на вашу реальну IP адресу!**

### Крок 3: Запустіть проект

**Автоматично:**
```cmd
start.cmd
```

**Вручну:**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev -- --host 0.0.0.0
```

⚠️ **Важливо:** Додайте `--host 0.0.0.0` для Vite, щоб він слухав на всіх інтерфейсах!

### Крок 4: Налаштуйте Firewall (Windows)

Windows може блокувати порти. Відкрийте порти 4000 та 5173:

**Спосіб 1: Автоматично (PowerShell від адміністратора):**
```powershell
New-NetFirewallRule -DisplayName "Marble Race Backend" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Marble Race Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
```

**Спосіб 2: Через GUI:**
1. Win + R → `wf.msc` → Enter
2. "Inbound Rules" → "New Rule..."
3. Port → TCP → 4000,5173 → Allow
4. Застосувати до всіх профілів

### Крок 5: Перевірте доступ

**З вашого комп'ютера:**
- Frontend: http://localhost:5173
- Backend: http://localhost:4000/health

**З іншого пристрою в мережі** (телефон, ноутбук):
- Frontend: http://192.168.1.100:5173
- Backend: http://192.168.1.100:4000/health

⚠️ **Використовуйте вашу IP адресу замість `192.168.1.100`!**

---

## 📱 Тестування на телефоні

### Варіант 1: Просто браузер

Відкрийте в браузері телефону:
```
http://192.168.1.100:5173
```

Telegram WebApp SDK буде працювати в dev режимі з mock користувачем.

### Варіант 2: Через Telegram Bot (WebApp)

Для повноцінного тестування як Telegram Mini App потрібен HTTPS. Є кілька варіантів:

#### 2.1. LocalTunnel (найпростіший)

```bash
# Встановіть localtunnel
npm install -g localtunnel

# Запустіть тунель для frontend
lt --port 5173 --subdomain marblerace
```

Ви отримаєте URL типу: `https://marblerace.loca.lt`

**Налаштуйте в BotFather:**
```
/newapp
/setappurl - https://marblerace.loca.lt
```

⚠️ **Проблема:** Backend залишається на локальній IP, потрібен окремий тунель або ngrok.

#### 2.2. Ngrok (рекомендовано)

```bash
# Встановіть ngrok з https://ngrok.com/download

# Тунель для frontend
ngrok http 5173

# У другому терміналі - тунель для backend
ngrok http 4000
```

Ви отримаєте 2 HTTPS URLs:
- Frontend: `https://abc123.ngrok.io`
- Backend: `https://xyz789.ngrok.io`

**Оновіть frontend `.env`:**
```env
VITE_API_URL=https://xyz789.ngrok.io
VITE_API_BASE_URL=https://xyz789.ngrok.io
VITE_WS_BASE_URL=wss://xyz789.ngrok.io
```

**Налаштуйте в BotFather:**
```
/mybots → YourBot → Bot Settings → Menu Button → Edit menu button URL
URL: https://abc123.ngrok.io
```

#### 2.3. Cloudflare Tunnel (безкоштовний, стабільний)

```bash
# Встановіть cloudflared
# Windows: завантажте з https://github.com/cloudflare/cloudflared/releases

# Frontend tunnel
cloudflared tunnel --url http://localhost:5173

# Backend tunnel (в іншому терміналі)
cloudflared tunnel --url http://localhost:4000
```

---

## 🔧 Скрипт для запуску з --host

Оновимо `start.cmd` для підтримки мережевого доступу:

**frontend/package.json:**
```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "dev:local": "vite",
    "build": "tsc && vite build"
  }
}
```

Тепер `npm run dev` автоматично дозволить доступ з мережі.

---

## 🧪 Перевірка підключення

### Тест 1: Ping

```bash
ping 192.168.1.100
```

Якщо не працює - перевірте Wi-Fi роутер (AP Isolation може бути увімкнений).

### Тест 2: Curl з телефону

Використовуйте Terminal app (Termux на Android):
```bash
curl http://192.168.1.100:4000/health
```

Повинно повернути: `{"status":"ok"}`

### Тест 3: Browser DevTools

На телефоні відкрийте Chrome DevTools (через chrome://inspect на ПК):
1. Підключіть телефон USB
2. Увімкніть USB Debugging
3. Chrome → chrome://inspect
4. Перегляньте Console та Network

---

## ⚠️ Типові проблеми

### 1. Телефон не може підключитись

**Рішення:**
- Переконайтесь що обидва пристрої в одній Wi-Fi мережі
- Вимкніть VPN на ПК або телефоні
- Перевірте Firewall (див. Крок 4)
- Деякі публічні Wi-Fi блокують міжпристроєве спілкування (AP Isolation)

### 2. CORS помилки

**Рішення:** Backend вже налаштований з CORS:
```typescript
// backend/src/app.ts
app.register(cors, {
  origin: true, // Дозволити всі origins для dev
});
```

Якщо проблема залишається, додайте:
```typescript
origin: ['http://192.168.1.100:5173', 'http://localhost:5173'],
```

### 3. Telegram WebApp не працює локально

**Причина:** Telegram вимагає HTTPS для WebApp.

**Рішення:** Використовуйте ngrok або Cloudflare Tunnel (див. вище).

### 4. "Refused to connect" на телефоні

**Рішення:**
1. Перевірте що backend запущений: `curl http://192.168.1.100:4000/health`
2. Перевірте Frontend console на помилки
3. Перевірте що IP адреса в `.env` правильна
4. Перезапустіть frontend після зміни `.env`

---

## 📝 Чеклист для локального тестування

- [ ] Дізнався свою IP адресу (ipconfig)
- [ ] Оновив `frontend/.env` з правильною IP
- [ ] Відкрив порти 4000 та 5173 в Firewall
- [ ] Запустив backend: `cd backend && npm run dev`
- [ ] Запустив frontend: `cd frontend && npm run dev` (з --host 0.0.0.0)
- [ ] Перевірив `http://192.168.1.100:4000/health` в браузері ПК
- [ ] Перевірив `http://192.168.1.100:5173` в браузері ПК
- [ ] Перевірив `http://192.168.1.100:5173` на телефоні
- [ ] Створив користувача через API
- [ ] Поповнив баланс через API
- [ ] Протестував створення гри на телефоні

---

## 🎮 Готові команди

**Отримати свою IP (Windows):**
```cmd
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do @echo %%a
```

**Відкрити порти (PowerShell адміністратор):**
```powershell
New-NetFirewallRule -DisplayName "Marble Race" -Direction Inbound -LocalPort 4000,5173 -Protocol TCP -Action Allow
```

**Запустити з правильними налаштуваннями:**
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev -- --host 0.0.0.0
```

**Перевірити доступність:**
```bash
curl http://localhost:4000/health
curl http://YOUR_IP:4000/health
```

---

## 💡 Поради

1. **Статична IP:** Налаштуйте статичну IP для вашого ПК в роутері, щоб вона не змінювалась
2. **Hotspot:** Можете роздати Wi-Fi з телефону та підключити ПК до нього
3. **USB Tethering:** Підключіть телефон USB + увімкніть tethering для більш стабільного з'єднання
4. **QR Code:** Згенеруйте QR код з URL для швидкого доступу: https://qr.io

---

Готово! Тепер ви можете тестувати гру локально на всіх пристроях у вашій мережі 🎮