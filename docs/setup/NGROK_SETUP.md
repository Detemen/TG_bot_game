# Інструкція: Запуск Marble Race через Ngrok (ОНОВЛЕНО)

Найпростіший спосіб тестувати Telegram Mini App локально.

## 🚀 Швидкий старт (одна команда!)

```cmd
start.cmd
```

**Це все!** Скрипт автоматично:
1. Зупинить старі процеси (node.exe, ngrok.exe)
2. Згенерує Prisma Client
3. Запустить Backend на порту 4000
4. Запустить Frontend на порту 5173 (з перевіркою!)
5. Запустить Ngrok тунель на порт 5173

---

## 📦 Що потрібно мати (перший раз)

### 1. Ngrok встановлено

**Варіант А:** Покласти `ngrok.exe` в папку проекту
```
F:\PY\TG_bot_game\ngrok.exe  ← тут
```

**Варіант Б:** Встановити глобально
```powershell
winget install Ngrok.Ngrok
```

Завантажити: https://ngrok.com/download

### 2. (Опціонально) Налаштувати authtoken

Якщо у вас є акаунт ngrok:
```cmd
ngrok config add-authtoken YOUR_TOKEN
```

Але це не обов'язково для базового використання!

---

Відкриються **3 вікна командного рядка:**

### Вікно 1: "Marble Race - Backend"
```
Server listening on port 4000
```
✅ Це означає backend працює!

### Вікно 2: "Marble Race - Frontend"
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```
✅ Це означає frontend працює на порту 5173!

### Вікно 3: "Marble Race - Ngrok"
```
Session Status                online
Forwarding                    https://xxxxx.ngrok-free.app -> http://localhost:5173
```
✅ **СКОПІЮЙТЕ ЦЕЙ HTTPS URL!**

---

## 📱 Налаштування в Telegram

### 1. Скопіюйте URL з вікна Ngrok

Шукайте рядок:
```
Forwarding  https://xxxxx.ngrok-free.app -> http://localhost:5173
```

Скопіюйте: `https://xxxxx.ngrok-free.app`

### 2. Налаштуйте @BotFather

1. Відкрийте @BotFather в Telegram
2. Відправте: `/myapps`
3. Виберіть свого бота
4. Натисніть **"Web App URL"**
5. Вставте URL з ngrok
6. Підтвердіть

### 3. Тестуйте!

1. Відкрийте вашого бота в Telegram
2. Натисніть кнопку Web App
3. Гра завантажиться! 🎉

---

## 🔍 Якщо бачите "Помилка авторизації"

### Крок 1: Відкрийте консоль браузера

**Telegram Desktop:** натисніть `Ctrl + Shift + I` або `F12`

### Крок 2: Шукайте повідомлення

В консолі шукайте:
```
[TelegramContext] Initializing...
[TelegramContext] Telegram user data: ...
[TelegramContext] Using Telegram user / No Telegram user data, using mock user
[App] Render state: {...}
```

### Крок 3: Клікніть "Відлагоджувальна інформація"

На екрані помилки є панель з детальною інформацією в JSON форматі.

**Що перевіряти:**

| Поле | Що має бути | Що означає |
|------|-------------|------------|
| `error` | null або "Failed to fetch" | Помилка з'єднання з backend |
| `isLoading` | false | Якщо true - завис |
| `telegramUser` | null або object | null - нормально, створюється mock |
| `user` | object | null - проблема з БД/Backend |
| `apiUrl` | "http://localhost:4000" | Має бути localhost |

### Крок 4: Типові проблеми

**`error: "Failed to fetch"`**
- Backend не запущений
- Перевірте вікно "Marble Race - Backend"
- Має бути "Server listening on port 4000"

**`isLoading: true` (залип)**
- Перевірте консоль Backend на помилки
- Можлива проблема з БД

**`user: null`**
- UserContext не зміг створити користувача
- Перевірте Backend логи
- Можливо Prisma Client не згенерований

---

## 🛠️ Інші проблеми та рішення

### Frontend запускається на іншому порті (5174, 5175...)

**Проблема:** Порт 5173 зайнятий старим процесом.

**Рішення:**
```cmd
taskkill //F //IM node.exe
```
Зачекайте 5 секунд, потім:
```cmd
start.cmd
```

### Ngrok показує "ERR_NGROK_3200"

**Проблема:** Тунель закінчився або не активний.

**Рішення:** Просто перезапустіть `start.cmd`

### "ngrok not found"

**Проблема:** ngrok.exe не знайдено.

**Рішення:**
- Переконайтесь, що `ngrok.exe` в папці `F:\PY\TG_bot_game\`
- Або встановіть глобально: `winget install Ngrok.Ngrok`

### Backend показує Prisma помилки

**Проблема:** Prisma Client не згенерований.

**Рішення:**
```cmd
cd backend
npx prisma generate
npx prisma db push
```

Або просто перезапустіть `start.cmd` (він автоматично робить generate).

---

## 📝 Важливі примітки

### Обмеження безкоштовного Ngrok

- ⚠️ **URL змінюється** при кожному перезапуску
- 40 з'єднань/хвилину
- Попередження при першому відкритті (обходиться автоматично)

### Режим розробки

Файл `frontend/.env`:
```env
VITE_DEV_MODE=true
```

Це означає:
- Автоматичне створення mock користувача
- Детальне логування
- Гаряче перезавантаження

### Mock користувач

Коли немає даних Telegram, створюється:
```javascript
{
  id: 123456789,
  first_name: 'Dev',
  last_name: 'User',
  username: 'devuser',
  language_code: 'uk'
}
```

---

## ✅ Контрольний список

**Перед запуском:**
- [ ] `ngrok.exe` в папці проекту
- [ ] Всі попередні процеси закриті
- [ ] Docker запущений (якщо використовуєте)

**Після запуску:**
- [ ] 3 вікна відкрилися
- [ ] Backend: "Server listening on port 4000"
- [ ] Frontend: "Local: http://localhost:5173/"
- [ ] Ngrok: "Forwarding https://xxxxx.ngrok-free.app"
- [ ] URL додано в @BotFather
- [ ] Бот відкривається в Telegram

---

## 🆘 Якщо нічого не працює

1. Закрийте всі вікна
2. Виконайте:
   ```cmd
   taskkill //F //IM node.exe
   taskkill //F //IM ngrok.exe
   ```
3. Зачекайте 5 секунд
4. Запустіть:
   ```cmd
   start.cmd
   ```
5. Перевірте всі 3 вікна на помилки
6. Відкрийте консоль браузера (F12)
7. Шукайте `[TelegramContext]` та `[App]`

---

**Версія:** 2.0 (Оновлено 2025-11-20)
**Протестовано на:** Windows 11, Telegram Desktop
