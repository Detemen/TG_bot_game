# ⚡ Швидкий старт для локального тестування

## 5 кроків до гри на телефоні:

### 1️⃣ Дізнайтесь свою IP
```cmd
get-ip.cmd
```
Записуйте IP адресу (наприклад: `192.168.1.100`)

### 2️⃣ Відкрийте порти
```powershell
# Клік правою кнопкою на PowerShell → Run as Administrator
.\open-ports.ps1
```

### 3️⃣ Оновіть frontend/.env
```env
VITE_API_URL=http://192.168.1.100:4000
VITE_API_BASE_URL=http://192.168.1.100:4000
VITE_WS_BASE_URL=ws://192.168.1.100:4000
VITE_DEV_MODE=true
```
⚠️ Замініть `192.168.1.100` на вашу IP!

### 4️⃣ Запустіть проект
```cmd
start.cmd
```

Чекайте поки запустяться:
- ✅ Prisma Dev (база даних)
- ✅ Backend (http://localhost:4000)
- ✅ Frontend (http://localhost:5173)

### 5️⃣ Відкрийте на телефоні
```
http://192.168.1.100:5173
```

---

## 🧪 Перевірка

**На ПК:**
```
http://localhost:5173 ✅
http://192.168.1.100:5173 ✅
```

**На телефоні:**
```
http://192.168.1.100:5173 ✅
```

---

## ⚠️ Не працює?

### Телефон не може підключитись?

1. **Перевірте що обидва пристрої в одній Wi-Fi мережі**
2. **Вимкніть VPN** на ПК та телефоні
3. **Перезапустіть firewall правила:**
   ```powershell
   .\open-ports.ps1
   ```

### Backend не відповідає?

Перевірте що backend запущений:
```bash
curl http://localhost:4000/health
```

Повинно повернути:
```json
{"status":"ok"}
```

### IP адреса змінилась?

Роутер може змінювати IP. Повторіть кроки 1 та 3.

---

## 🎮 Тестування гри

1. **Відкрийте на телефоні:** `http://192.168.1.100:5173`
2. **Консоль покаже mock користувача:** Dev User (ID: 123456789)
3. **Поповніть баланс через API з ПК:**

```bash
# Знайдіть userId в консолі браузера телефону
curl -X POST http://localhost:4000/users/deposit \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR_USER_ID","amount":"10","currency":"TON","referenceId":"test-1"}'
```

4. **Оновіть сторінку на телефоні** - баланс оновиться
5. **Створіть гру** → Кнопка "+ Створити нову гру"
6. **Приєднайтесь** → Виберіть кількість кульок
7. **Дочекайтесь старту** → 30 секунд або ручний старт
8. **Спостерігайте за грою!** 🎲

---

## 📱 Telegram WebApp (опціонально)

Для повноцінного тестування як Telegram Mini App потрібен HTTPS.

### Швидкий варіант - Ngrok:

```bash
# Завантажте ngrok: https://ngrok.com/download

# Terminal 1 - Frontend tunnel
ngrok http 5173

# Terminal 2 - Backend tunnel
ngrok http 4000
```

Отримаєте URLs:
- Frontend: `https://abc123.ngrok.io`
- Backend: `https://xyz789.ngrok.io`

**Оновіть frontend/.env:**
```env
VITE_API_URL=https://xyz789.ngrok.io
VITE_API_BASE_URL=https://xyz789.ngrok.io
VITE_WS_BASE_URL=wss://xyz789.ngrok.io
```

**Налаштуйте в BotFather:**
```
/mybots → Your Bot → Bot Settings → Menu Button
URL: https://abc123.ngrok.io
```

Тепер можна тестувати через Telegram!

---

## 📚 Детальна документація

- [LOCAL_TESTING.md](LOCAL_TESTING.md) - Повна інструкція
- [README.md](README.md) - Загальна інформація
- [backend/API.md](backend/API.md) - API документація
- [TESTING.md](TESTING.md) - Сценарії тестування

---

## ✨ Швидкі команди

**Дізнатись IP:**
```cmd
get-ip.cmd
```

**Відкрити порти:**
```powershell
.\open-ports.ps1
```

**Запустити проект:**
```cmd
start.cmd
```

**Перевірити backend:**
```bash
curl http://localhost:4000/health
```

**Поповнити баланс:**
```bash
curl -X POST http://localhost:4000/users/deposit \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","amount":"10","currency":"TON","referenceId":"test-1"}'
```

**Створити гру:**
```bash
curl -X POST http://localhost:4000/games \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","difficulty":"easy"}'
```

---

Готово! 🎉 Тепер ви можете тестувати Marble Race локально на всіх пристроях у вашій мережі!
