# ☁️ Cloudflare Tunnel - Інструкція

Це найкращий безкоштовний спосіб отримати HTTPS для Telegram WebApp.

## 📥 Крок 1: Встановлення cloudflared

### Варіант А: Через WinGet (найпростіший)

```powershell
winget install cloudflare.cloudflared
```

### Варіант Б: Вручну

1. Перейдіть на: https://github.com/cloudflare/cloudflared/releases
2. Завантажте `cloudflared-windows-amd64.exe`
3. Перемістіть у `F:\PY\`
4. Перейменуйте на `cloudflared.exe`

### Перевірка встановлення:

```cmd
cloudflared --version
```

Якщо команда не працює, додайте `F:\PY\` до PATH або використовуйте повний шлях.

---

## 🚀 Крок 2: Запуск тунелів

**ВАЖЛИВО:** Потрібні 2 окремі тунелі - для Frontend і Backend.

### Термінал 1: Запустіть Backend тунель

```cmd
tunnel-backend.cmd
```

Чекайте доки з'явиться URL типу:
```
https://abc-xyz-123.trycloudflare.com
```

**Скопіюйте цей URL!** Це ваш Backend API endpoint.

### Термінал 2: Запустіть Frontend тунель

```cmd
tunnel-frontend.cmd
```

Чекайте доки з'явиться URL типу:
```
https://def-uvw-456.trycloudflare.com
```

**Скопіюйте цей URL!** Це ваш Frontend URL для Telegram.

---

## ⚙️ Крок 3: Оновіть конфігурацію

### Frontend `.env`:

Замініть URLs на ті що ви отримали:

```env
VITE_API_URL=https://abc-xyz-123.trycloudflare.com
VITE_API_BASE_URL=https://abc-xyz-123.trycloudflare.com
VITE_WS_BASE_URL=wss://abc-xyz-123.trycloudflare.com
VITE_DEV_MODE=false
```

⚠️ **Використовуйте Backend URL (з tunnel-backend.cmd)!**

### Перезапустіть Frontend:

```cmd
# Зупиніть поточний frontend (Ctrl+C)
cd frontend
npm run dev
```

---

## 📱 Крок 4: Налаштуйте Telegram Bot

### У BotFather:

1. Знайдіть свого бота: `/mybots`
2. Виберіть бота → `Bot Settings`
3. `Menu Button` → `Edit menu button URL`
4. Вставте Frontend URL:
   ```
   https://def-uvw-456.trycloudflare.com
   ```

### Або через команди:

```
/setmenubutton
@YourBotUsername
<вставте Frontend URL>
```

---

## 🧪 Крок 5: Тестування

1. **Відкрийте Telegram** на телефоні
2. **Знайдіть свого бота**
3. **Натисніть на Menu button** (іконка біля поля вводу)
4. **Гра має відкритись у WebApp!** 🎉

---

## 📋 Структура запущених процесів

Після всього у вас має бути **5 відкритих вікон терміналу**:

```
1. Prisma Dev      - База даних (51213-51215)
2. Backend         - API сервер (localhost:4000)
3. Frontend        - React app (localhost:5173)
4. Backend Tunnel  - HTTPS для API (https://...)
5. Frontend Tunnel - HTTPS для WebApp (https://...)
```

---

## 🔍 Перевірка що все працює

### Перевірте Backend через тунель:

```bash
curl https://abc-xyz-123.trycloudflare.com/health
```

Має повернути:
```json
{"status":"ok"}
```

### Перевірте Frontend через тунель:

Відкрийте в браузері:
```
https://def-uvw-456.trycloudflare.com
```

Має завантажитись сторінка гри.

---

## ⚠️ Важливі нюанси

### 1. URLs змінюються при кожному перезапуску

Cloudflare Tunnel (безкоштовна версія) генерує **новий URL кожного разу**.

**Рішення:**
- Щоразу оновлюйте `frontend/.env`
- Щоразу оновлюйте URL в BotFather
- Або використовуйте платну версію Cloudflare Tunnel з постійним доменом

### 2. Тримайте вікна відкритими

Не закривайте вікна з тунелями - вони мають працювати постійно.

### 3. CORS може не працювати

Якщо виникають CORS помилки, переконайтесь що:
- Backend правильно налаштований (вже є в коді)
- Frontend використовує правильний Backend URL
- Перезапустили frontend після зміни `.env`

---

## 🛠️ Troubleshooting

### Cloudflared не знайдено

```
where cloudflared
```

Якщо не працює:
1. Перезапустіть термінал після встановлення
2. Або використовуйте повний шлях: `F:\PY\cloudflared.exe`

### Тунель не стартує

```
Error: failed to sufficiently increase receive buffer size
```

**Рішення:** Ігноруйте це попередження, тунель все одно працюватиме.

### Frontend не підключається до Backend

1. Перевірте що Backend тунель працює
2. Перевірте `frontend/.env` - має бути Backend URL
3. Перезапустіть frontend після зміни `.env`
4. Відкрийте DevTools в Telegram WebApp → Console

### "Can't reach backend" в грі

**Причини:**
- Backend тунель закрито
- Неправильний URL в `.env`
- Backend сервер не запущений

**Рішення:**
```bash
# Перевірте що всі процеси працюють
curl http://localhost:4000/health  # Backend локально
curl https://YOUR_BACKEND_URL/health  # Backend через тунель
```

---

## 💡 Корисні команди

**Запустити все разом:**

Terminal 1:
```cmd
start.cmd  # Запускає Prisma + Backend + Frontend
```

Terminal 2:
```cmd
tunnel-backend.cmd
```

Terminal 3:
```cmd
tunnel-frontend.cmd
```

**Зупинити все:**

Закрийте всі вікна терміналів або натисніть Ctrl+C в кожному.

---

## 🎯 Швидкий чеклист

- [ ] Встановив cloudflared
- [ ] Запустив `start.cmd` (Backend + Frontend локально)
- [ ] Запустив `tunnel-backend.cmd` → отримав Backend URL
- [ ] Запустив `tunnel-frontend.cmd` → отримав Frontend URL
- [ ] Оновив `frontend/.env` з Backend URL
- [ ] Перезапустив frontend
- [ ] Налаштував Frontend URL в BotFather
- [ ] Перевірив Backend: `curl https://BACKEND_URL/health`
- [ ] Відкрив бота в Telegram → Menu button → Гра працює! 🎉

---

## 📚 Альтернативи Cloudflare Tunnel

Якщо Cloudflare Tunnel не підходить:

### Ngrok (простіший, але обмежений)

```bash
# Встановлення
winget install Ngrok.Ngrok

# Запуск
ngrok http 5173  # Frontend
ngrok http 4000  # Backend (в іншому терміналі)
```

### LocalTunnel (найпростіший)

```bash
npm install -g localtunnel

lt --port 5173 --subdomain marblerace  # Frontend
lt --port 4000 --subdomain marblerace-api  # Backend
```

### Pagekite (стабільний)

Альтернатива з підтримкою custom domains.

---

Готово! Тепер ви можете тестувати Marble Race через Telegram бота з будь-якого місця 🚀
