# Інструкція для тестування Marble Race

## Підготовка

### 1. База даних
```bash
cd backend
npx prisma generate
npx prisma db push
```

### 2. Запуск backend
```bash
cd backend
npm run dev
```
Backend стартує на `http://localhost:4000`

### 3. Запуск frontend
```bash
cd frontend
npm run dev
```
Frontend стартує на `http://localhost:5173`

---

## Тестування через браузер

### Крок 1: Відкрити застосунок
Відкрийте `http://localhost:5173` в браузері

**Що повинно статись:**
- ✅ Показується spinner "Завантаження..."
- ✅ Автоматично створюється dev користувач (ID: 123456789)
- ✅ Відкривається Lobby Page з балансом 0 TON / 0 Stars

### Крок 2: Поповнити баланс (через API)
Оскільки payment integration ще не готова, поповнимо баланс вручну через API.

**Отримати userId:**
1. Відкрийте DevTools (F12) → Console
2. Знайдіть у Network вкладці запит до `/users/register`
3. У відповіді скопіюйте `id` користувача

**Поповнити баланс:**
```bash
# Замініть YOUR_USER_ID на ваш ID
curl -X POST http://localhost:4000/users/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "amount": "10.0",
    "currency": "TON",
    "referenceId": "test-deposit-1"
  }'
```

**Що повинно статись:**
- ✅ Відповідь: `{"transaction": {...}, "newBalance": {"ton": "10.0", "stars": 0}}`
- ✅ Оновіть сторінку - баланс показує 10.0 TON

### Крок 3: Створити гру
Натисніть кнопку **"+ Створити нову гру"**

**Що повинно статись:**
- ✅ Гра з'являється в списку "Активні ігри"
- ✅ Статус: "Очікування гравців"
- ✅ Pot: 0 TON / 0 ⭐
- ✅ Слоти: 0 / 60
- ✅ Гравці: 0

### Крок 4: Приєднатись до гри
1. Клікніть на картку гри (вона розкриється)
2. Виберіть кількість кульок: **5**
3. Виберіть валюту: **TON**
4. Перевірте: Всього: **0.50 TON**
5. Натисніть **"Приєднатись до гри"**

**Що повинно статись:**
- ✅ Баланс зменшився: 10.0 → 9.5 TON
- ✅ Pot збільшився: 0 → 0.5 TON
- ✅ Слоти: 0 → 5 / 60
- ✅ Гравці: 0 → 1
- ✅ Статус змінився на "Скоро старт!" (countdown почався)

### Крок 5: Перевірити automatic start
Почекайте 30 секунд після join.

**Що повинно статись:**
- ✅ Через 30 секунд статус змінюється на "Йде гра"
- ✅ Гра зникає зі списку активних (переходить в RUNNING)

---

## Тестування з двома гравцями

### Варіант А: Два браузери
1. Відкрийте `http://localhost:5173` в Chrome
2. Відкрийте `http://localhost:5173` в Firefox (або Incognito)
3. Кожен браузер створить свого dev користувача
4. Поповніть баланс обом через API (різні userId)
5. Перший гравець створює гру
6. Другий гравець приєднується
7. Обидва бачать оновлення в real-time (через 5-sec polling)

### Варіант Б: API тестування
```bash
# Користувач 1: Створити гру
curl -X POST http://localhost:4000/games \
  -H "Content-Type: application/json" \
  -d '{"difficulty": "medium"}'

# Відповідь містить gameId

# Користувач 1: Join
curl -X POST http://localhost:4000/games/{gameId}/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_1_ID",
    "ballCount": 3,
    "currency": "TON"
  }'

# Користувач 2: Join
curl -X POST http://localhost:4000/games/{gameId}/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_2_ID",
    "ballCount": 5,
    "currency": "TON"
  }'

# Перевірити гру
curl http://localhost:4000/games/{gameId}
```

---

## Перевірка бізнес-логіки

### Тест 1: Insufficient balance
Спробуйте join з кількістю кульок, яка перевищує баланс.

**Очікується:**
- ❌ Помилка: "Insufficient balance. Need X TON"

### Тест 2: Maximum balls per player
Спробуйте join з 11 кульками (максимум 10).

**Очікується:**
- ❌ Input обмежений до 10
- ❌ Join не спрацює якщо хтось змінить через DevTools

### Тест 3: Double join
Спробуйте приєднатись до тієї ж гри двічі.

**Очікується:**
- ❌ Помилка: "User already joined this game"

### Тест 4: Full game
Створіть гру і приєднайтесь з 60 кульками (або декілька гравців до 60).

**Очікується:**
- ✅ Гра автоматично стартує (не чекає 30 секунд)
- ✅ Статус: RUNNING

### Тест 5: Minimum players
Створіть гру, join 1 гравець, почекайте 30 секунд.

**Очікується:**
- ❌ Гра скасовується (status: CANCELLED)
- ✅ Гравець отримує refund (баланс повертається)

---

## API Endpoints для тестування

### User
- `POST /users/register` - Реєстрація
- `GET /users/me?userId=...` - Профіль
- `POST /users/deposit` - Депозит
- `GET /users/transactions?userId=...` - Транзакції
- `GET /users/leaderboard` - Топ гравців

### Game
- `GET /games` - Активні ігри
- `GET /games/finished` - Завершені ігри
- `POST /games` - Створити гру
- `GET /games/:id` - Деталі гри
- `POST /games/:id/join` - Приєднатись
- `POST /games/:id/finish` - Завершити (admin)
- `GET /games/history/user?userId=...` - Історія

---

## Що ще НЕ працює

1. ❌ **Finish game** - потрібен Game Room з Matter.js симуляцією
2. ❌ **Real-time ball positions** - потрібен WebSocket /ws/game/:id
3. ❌ **Winner detection** - симуляція ще не запускається
4. ❌ **TON payments** - потрібен TON Connect SDK
5. ❌ **Telegram authentication** - працює тільки mock user

---

## Наступні кроки

1. **Game Room UI** - відображення гри з Matter.js Canvas
2. **WebSocket integration** - real-time синхронізація позицій
3. **Finish game flow** - визначення переможця + payout
4. **TON Connect** - реальні депозити/виводи
5. **Telegram Bot** - запуск через бота

---

## Дебаг

### Backend logs
```bash
cd backend
npm run dev
```
Логи показуються в консолі (Pino logger)

### Frontend logs
Відкрийте DevTools → Console
Всі помилки API показуються в консолі

### Database
```bash
cd backend
npx prisma studio
```
Відкриває GUI для перегляду бази даних на `http://localhost:5555`

---

## Корисні команди

```bash
# Перезапустити базу даних
cd backend
npx prisma db push --force-reset

# Подивитись всі ігри
curl http://localhost:4000/games

# Подивитись користувача
curl "http://localhost:4000/users/me?userId=YOUR_ID"

# Створити тестових користувачів з балансом
# (потрібно створити окремий script)
```
