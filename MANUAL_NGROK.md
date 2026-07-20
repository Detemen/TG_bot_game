# 🚀 Простий спосіб запустити Ngrok

## Крок 1: Завантажте ngrok вручну

1. Перейдіть: https://ngrok.com/download
2. Завантажте **Windows (AMD64)** версію
3. Розпакуйте `ngrok.exe` в папку `F:\PY\TG_bot_game\`

## Крок 2: Налаштуйте authtoken

Відкрийте PowerShell в `F:\PY\TG_bot_game\` та виконайте:

```powershell
.\ngrok.exe config add-authtoken 35iKbHvps3YVvG1qgLF84WC9ryz_7bt8A6ifwdZkLHgmjhk6d
```

## Крок 3: Запустіть тунелі

### Terminal 1 - Backend:
```powershell
.\ngrok.exe http 4000
```

Скопіюйте URL (наприклад: `https://abc-123.ngrok-free.app`)

### Terminal 2 - Frontend:
```powershell
.\ngrok.exe http 5173
```

Скопіюйте URL (наприклад: `https://def-456.ngrok-free.app`)

## Крок 4: Оновіть frontend/.env

Використайте Backend URL:

```env
VITE_API_URL=https://abc-123.ngrok-free.app
VITE_API_BASE_URL=https://abc-123.ngrok-free.app
VITE_WS_BASE_URL=wss://abc-123.ngrok-free.app
VITE_DEV_MODE=false
```

## Крок 5: Перезапустіть frontend

```powershell
cd frontend
npm run dev
```

## Крок 6: Налаштуйте @BotFather

Вставте Frontend URL в Menu Button вашого бота.

---

## 📱 Готово!

Відкрийте бота в Telegram → Menu button → Грайте! 🎉

---

## 💡 Швидкий чеклист:

- [ ] Завантажив ngrok.exe в F:\PY\TG_bot_game\
- [ ] Налаштував authtoken
- [ ] Запустив backend tunnel → отримав Backend URL
- [ ] Запустив frontend tunnel → отримав Frontend URL
- [ ] Оновив frontend/.env з Backend URL
- [ ] Перезапустив frontend
- [ ] Налаштував Frontend URL в @BotFather
- [ ] Тестую в Telegram! ✅
