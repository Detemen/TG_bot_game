# Marble Race Game 🎲

![React](https://img.shields.io/badge/React-frontend-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-backend-339933?logo=node.js&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-Mini%20App-26A5E4?logo=telegram&logoColor=white)

Telegram Mini App для ігор у Marble Race з можливістю робити ставки в TON та Telegram Stars.

## 🚀 Швидкий старт

### Варіант 1: Тестування через Telegram (ngrok) - РЕКОМЕНДОВАНО

**Для тестування як справжній Telegram Mini App:**

1. **Запустіть одну команду:**
   ```cmd
   start.cmd
   ```
   Це автоматично:
   - Зупинить старі процеси
   - Згенерує Prisma Client
   - Запустить Backend (порт 4000)
   - Запустить Frontend (порт 5173)
   - Запустить Ngrok тунель

2. **Знайдіть HTTPS URL у вікні Ngrok:**
   - Шукайте рядок типу: `https://xxxxx.ngrok-free.app`

3. **Налаштуйте в @BotFather:**
   - Відкрийте @BotFather в Telegram
   - Відправте `/myapps`
   - Виберіть свого бота
   - Виберіть "Web App URL"
   - Вставте URL з ngrok

4. **Тестуйте!**
   - Відкрийте бота в Telegram
   - Натисніть на Web App
   - Гра повинна завантажитись

📖 **Відлагодження:** Якщо виникають помилки, відкрийте консоль браузера (F12) та шукайте повідомлення від `[TelegramContext]` та `[App]`. На екрані помилки є панель відлагодження з детальною інформацією.

---

### Варіант 2: Локальне тестування (Wi-Fi)

**Для тестування в локальній мережі (Wi-Fi):**

1. **Дізнайтесь вашу IP адресу:**
   ```cmd
   get-ip.cmd
   ```

2. **Відкрийте порти у Firewall:**
   ```powershell
   # PowerShell від адміністратора
   .\open-ports.ps1
   ```

3. **Оновіть `frontend/.env` з вашою IP:**
   ```env
   VITE_API_URL=http://192.168.1.100:4000
   ```

4. **Запустіть проект:**
   ```cmd
   start.cmd
   ```

5. **Тестуйте з телефону:**
   ```
   http://192.168.1.100:5173
   ```

📖 **Детальна інструкція:** [LOCAL_TESTING.md](LOCAL_TESTING.md)

---

### Варіант 2: З Docker

1. **Запустіть Docker Desktop** (якщо встановлено)

2. **Запустіть базу даних:**
   ```bash
   docker-compose up -d
   ```

3. **Запустіть проект:**
   - Windows: запустіть `start.cmd`
   - Linux/Mac: запустіть `./start.sh`

### Варіант 3: Без Docker

Якщо Docker недоступний, використовуйте сервіс **Prisma Accelerate** або будь-який хмарний PostgreSQL.

1. **Отримайте DATABASE_URL:**
   - Для Prisma Accelerate: `npx prisma dev` (автоматично створює локальну БД)
   - Або використайте будь-який PostgreSQL сервіс (Neon, Railway, Supabase)

2. **Оновіть файл `backend/.env`:**
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/database"
   ```

3. **Запустіть проект:**
   - Windows: `start.cmd`
   - Linux/Mac: `./start.sh`

## 📋 Вимоги

- Node.js 18+ ([завантажити](https://nodejs.org))
- Docker Desktop ([завантажити](https://www.docker.com/products/docker-desktop)) - опціонально
- PostgreSQL (якщо не використовуєте Docker)

## 🏗️ Структура проекту

```
├── backend/          # Fastify API сервер
│   ├── src/
│   │   ├── services/ # Бізнес-логіка (User, Game, Transaction)
│   │   ├── routes/   # REST API endpoints
│   │   └── app.ts    # Головний файл додатку
│   └── prisma/       # Database schema та міграції
│
├── frontend/         # React + Vite + Matter.js
│   ├── src/
│   │   ├── pages/    # Lobby та GameRoom
│   │   ├── contexts/ # Telegram і User контексти
│   │   └── services/ # API клієнт
│
└── docs/             # Документація
```

## 🎮 Використання

1. **Відкрийте Frontend:**
   ```
   http://localhost:5173
   ```

2. **Поповніть баланс через API** (для тестування):
   ```bash
   curl -X POST http://localhost:4000/users/deposit \
     -H "Content-Type: application/json" \
     -d '{"userId":"YOUR_USER_ID","amount":"10","currency":"TON"}'
   ```

3. **Створіть гру:**
   - Натисніть "+ Створити нову гру" в Lobby

4. **Приєднайтесь до гри:**
   - Виберіть гру зі списку
   - Оберіть кількість кульок та валюту
   - Натисніть "Приєднатись"

5. **Почніть гру:**
   - Гра стартує автоматично через 30 секунд після першого гравця
   - Або коли всі слоти заповнені

## 🔧 Корисні команди

### Backend
```bash
cd backend

# Розробка
npm run dev

# Prisma Studio (UI для БД)
npx prisma studio

# Оновити схему БД
npx prisma db push

# Згенерувати Prisma Client
npx prisma generate
```

### Frontend
```bash
cd frontend

# Розробка
npm run dev

# Збірка
npm run build
```

## 📚 Документація

- [API Reference](backend/API.md) - Повний список endpoints
- [TESTING.md](TESTING.md) - Інструкції з тестування

## 🏗️ Реалізовані функції

✅ **Backend:**
- User Service (реєстрація, баланси, реферали)
- Game Service (повний lifecycle гри)
- Transaction Service (всі фінансові операції)
- REST API (17 endpoints)
- Automatic game start (30 секунд)
- Winner detection та payout (90% winner, 10% комісія)
- Referral система (5% бонус)

✅ **Frontend:**
- Telegram WebApp SDK інтеграція
- Lobby Page (список ігор, join)
- Game Room Page (Matter.js фізика)
- Real-time leaderboard
- Navigation між сторінками

⏳ **В розробці:**
- WebSocket синхронізація позицій кульок
- TON Connect 2.0 для wallet підключення
- Payment Service для депозитів
- History Page
- Mobile optimization
- Server-side physics validation

## 🛠️ Технології

**Backend:**
- Fastify - швидкий веб-фреймворк
- Prisma - ORM для PostgreSQL
- PostgreSQL - база даних
- Zod - валідація даних
- nanoid - генерація referral кодів

**Frontend:**
- React 18 - UI фреймворк
- TypeScript - типізація
- Vite - збірка та dev сервер
- Matter.js - 2D фізичний движок
- @twa-dev/sdk - Telegram WebApp SDK

## 🐛 Troubleshooting

### Помилка авторизації / Користувач не завантажується

**Симптоми:**
- Екран з текстом "Помилка авторізації"
- "Не вдалося завантажити дані користувача"

**Рішення:**

1. **Відкрийте консоль браузера (F12 в Telegram Desktop)**
   - Шукайте повідомлення `[TelegramContext]`
   - Шукайте повідомлення `[App]`

2. **Клікніть на "Відлагоджувальна інформація"** на екрані помилки
   - Перевірте `telegramUser` - повинен бути null або об'єкт
   - Перевірте `user` - повинен бути об'єкт після ініціалізації
   - Перевірте `error` - покаже конкретну помилку
   - Перевірте `apiUrl` - має бути `http://localhost:4000`

3. **Типові проблеми:**
   - `error: "Failed to fetch"` → Backend не запущений або недоступний
   - `isLoading: true` (залип) → Перевірте консоль backend на помилки
   - `telegramUser: null` → Це нормально, створюється mock користувач
   - `user: null` → UserContext не зміг створити користувача в БД

### Frontend запускається на невірному порті (5174, 5175...)

**Рішення:**
1. Закрийте ВСІ процеси node:
   ```cmd
   taskkill /F /IM node.exe
   ```
2. Зачекайте 5 секунд
3. Запустіть знову:
   ```cmd
   start.cmd
   ```

Скрипт тепер використовує `--strictPort` для гарантії порту 5173.

### Ngrok проблеми

**URL змінюється при кожному перезапуску:**
- Це нормально для безкоштовного плану ngrok
- Потрібно оновлювати URL в @BotFather кожного разу

**"ngrok not found" або ngrok не запускається:**
- Переконайтесь, що `ngrok.exe` знаходиться в папці проекту
- Або встановіть ngrok глобально

**ERR_NGROK_3200:**
- Тунель ngrok закінчився або не запустився
- Перезапустіть через `start.cmd`

### База даних недоступна

```
Error: Can't reach database server
```

**Рішення:**
1. Запустіть Docker Desktop
2. Виконайте `docker-compose up -d`
3. Або оновіть DATABASE_URL для використання хмарного PostgreSQL

### Порт 4000 зайнятий

```
Error: listen EADDRINUSE: address already in use :::4000
```

**Рішення:**
1. Зупиніть процес на порту 4000:
   ```cmd
   taskkill /F /IM node.exe
   ```
2. Або змініть PORT у `backend/.env`

### Frontend не підключається до API

**Рішення:**
1. Переконайтеся, що backend запущений
2. Перевірте VITE_API_URL у `frontend/.env`
3. Перевірте консоль браузера на CORS помилки
4. Переконайтеся, що backend показує "Server listening on port 4000"

### Prisma Client помилки

```
Invalid `prisma.user.findUnique()` invocation
```

**Рішення:**
```cmd
cd backend
npx prisma generate
npx prisma db push
```

## 📝 Ліцензія

MIT

## 🤝 Контрибуція

Pull requests вітаються! Для великих змін спочатку відкрийте issue для обговорення.
