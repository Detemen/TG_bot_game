# 📱 Швидке налаштування Telegram Bot

## Кроки для повноцінного тестування через Telegram

### 1️⃣ Встановіть cloudflared

```powershell
# Windows (PowerShell)
winget install cloudflare.cloudflared

# Або вручну з
https://github.com/cloudflare/cloudflared/releases
```

Перевірка:
```cmd
cloudflared --version
```

---

### 2️⃣ Запустіть всі сервіси

**Terminal 1 - Основний проект:**
```cmd
start.cmd
```

Чекайте поки запустяться:
- ✅ Prisma Dev (база даних)
- ✅ Backend (http://localhost:4000)
- ✅ Frontend (http://localhost:5173)

**Terminal 2 - Backend тунель:**
```cmd
tunnel-backend.cmd
```

Скопіюйте URL (наприклад: `https://abc-123.trycloudflare.com`)

**Terminal 3 - Frontend тунель:**
```cmd
tunnel-frontend.cmd
```

Скопіюйте URL (наприклад: `https://def-456.trycloudflare.com`)

---

### 3️⃣ Оновіть конфігурацію

Відредагуйте `frontend/.env`:

```env
VITE_API_URL=https://abc-123.trycloudflare.com
VITE_API_BASE_URL=https://abc-123.trycloudflare.com
VITE_WS_BASE_URL=wss://abc-123.trycloudflare.com
VITE_DEV_MODE=false
```

⚠️ **Використовуйте Backend URL (з Terminal 2)!**

**Перезапустіть Frontend:**
```cmd
# У вікні де запущений frontend натисніть Ctrl+C
# Потім:
cd frontend
npm run dev
```

---

### 4️⃣ Створіть/налаштуйте Telegram Bot

#### Якщо у вас ще немає бота:

1. **Відкрийте Telegram**
2. **Знайдіть @BotFather**
3. **Створіть бота:**
   ```
   /newbot
   My Marble Race Bot
   marblerace_test_bot
   ```

4. **Збережіть токен** (не потрібен для WebApp, але може знадобитись)

#### Налаштуйте WebApp:

```
/mybots
→ Виберіть свого бота
→ Bot Settings
→ Menu Button
→ Edit menu button URL
→ Вставте Frontend URL з Terminal 3
```

Наприклад:
```
https://def-456.trycloudflare.com
```

**Або через команду:**
```
/setmenubutton
@your_bot_username
<вставте URL>
```

---

### 5️⃣ Тестуйте!

1. **Знайдіть свого бота** в Telegram
2. **Натисніть кнопку Menu** (біля поля вводу)
3. **Гра відкриється у WebApp!** 🎉

---

## 🎮 Що тестувати:

### Базовий flow:

1. ✅ **WebApp відкривається** в Telegram
2. ✅ **Lobby Page** завантажується
3. ✅ **Дані користувача** з Telegram (ім'я, username)
4. ✅ **Haptic feedback** працює (вібрація при натисканні)

### Ігровий flow:

⚠️ **Спочатку поповніть баланс через API:**

```bash
# Дізнайтесь userId з консолі браузера або DevTools
curl -X POST http://localhost:4000/users/deposit \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","amount":"10","currency":"TON","referenceId":"test-1"}'
```

Потім у грі:

1. ✅ **Створіть гру** (+ Створити нову гру)
2. ✅ **Оберіть кульки** (1-10 штук)
3. ✅ **Виберіть валюту** (TON/STARS)
4. ✅ **Приєднайтесь** до гри
5. ✅ **Countdown** 30 секунд
6. ✅ **Гонка кульок** (Matter.js фізика)
7. ✅ **Фініш** та визначення переможця
8. ✅ **Виплата** (баланс оновлюється)

---

## 🔧 Налаштування для production

### Статичні домени (опціонально)

Якщо не хочете щоразу міняти URL:

**Cloudflare Teams (безкоштовно до 50 користувачів):**

1. Зареєструйтесь на https://dash.cloudflare.com
2. Створіть Zero Trust tunnel
3. Отримайте постійний домен `yourapp.pages.dev`

**Ngrok (платно $8/міс):**

1. Зареєструйтесь на https://ngrok.com
2. Отримайте постійний домен
3. Налаштуйте auth token

---

## 🐛 Типові проблеми

### WebApp не відкривається

**Причини:**
- Frontend тунель не працює
- Неправильний URL в BotFather
- URL не HTTPS

**Рішення:**
1. Перевірте що `tunnel-frontend.cmd` працює
2. Скопіюйте URL правильно (весь, з https://)
3. Оновіть URL в BotFather

### "Cannot connect to server"

**Причини:**
- Backend тунель не працює
- Неправильний Backend URL в `.env`
- Backend не запущений

**Рішення:**
```bash
# Перевірте Backend локально
curl http://localhost:4000/health

# Перевірте Backend через тунель
curl https://BACKEND_URL/health

# Перевірте frontend/.env
cat frontend/.env
```

### Telegram WebApp SDK помилки

**Причини:**
- Відкрили не через Telegram (прямо в браузері)
- Dev mode не вимкнено

**Рішення:**
1. ОБОВ'ЯЗКОВО відкривайте через Telegram бота
2. В `frontend/.env` встановіть `VITE_DEV_MODE=false`

### Баланс 0, не можу грати

**Рішення:**

Поповніть баланс через API:

```bash
# 1. Знайдіть userId в консолі браузера (F12 -> Console)
# Або в DevTools Telegram (через chrome://inspect на ПК)

# 2. Виконайте deposit
curl -X POST http://localhost:4000/users/deposit \
  -H "Content-Type: application/json" \
  -d '{"userId":"ВАШЕ_USER_ID","amount":"10","currency":"TON","referenceId":"test-deposit-1"}'

# 3. Оновіть сторінку в WebApp
```

---

## 📚 Корисні посилання

- **Telegram Bot API:** https://core.telegram.org/bots/api
- **Telegram WebApp:** https://core.telegram.org/bots/webapps
- **BotFather:** https://t.me/BotFather
- **Cloudflare Tunnel:** https://developers.cloudflare.com/cloudflare-one/connections/connect-apps
- **Ngrok:** https://ngrok.com

---

## ✨ Швидкий чеклист

### Перед запуском:
- [ ] Встановив cloudflared
- [ ] Створив/маю Telegram бота

### Запуск:
- [ ] Terminal 1: `start.cmd` (Backend + Frontend)
- [ ] Terminal 2: `tunnel-backend.cmd` → скопіював Backend URL
- [ ] Terminal 3: `tunnel-frontend.cmd` → скопіював Frontend URL
- [ ] Оновив `frontend/.env` з Backend URL
- [ ] Перезапустив frontend
- [ ] Налаштував Frontend URL в BotFather

### Тестування:
- [ ] Відкрив бота в Telegram
- [ ] Натиснув Menu button
- [ ] WebApp відкрився ✅
- [ ] Поповнив баланс через API
- [ ] Зіграв тестову гру ✅

---

Готово! Тепер ваш Marble Race доступний через Telegram бота 🎉
