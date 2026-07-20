# 🤖 Telegram Bot Integration Guide

Guide for integrating the Marble Race physics sandbox with the Telegram bot (`F:\PY\TG_bot_game`).

## 🎯 Integration Goals

1. **Host game as Telegram Mini App (WebApp)**
2. **Implement betting system with TON/Stars**
3. **Multiplayer races with shared seeds**
4. **Leaderboard and statistics**
5. **Real-time race viewing**

## 📋 Prerequisites

- Telegram bot registered via [@BotFather](https://t.me/botfather)
- Bot token stored in `.env` file
- Webhook or WebApp URL configured
- TON wallet integration (optional for betting)

## 🏗️ Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Telegram Bot   │◄───────►│   Web Server     │◄───────►│  Physics Game   │
│   (Python)      │  Events │  (FastAPI/Flask) │   HTTP  │  (JavaScript)   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                            │                            │
        │                            │                            │
        ▼                            ▼                            ▼
  aiogram/pyrogram          Game State DB             Matter.js Engine
   (Bot API)              (PostgreSQL/Redis)        (Client-side Physics)
```

## 🔧 Implementation Steps

### Step 1: Serve Static Files

Update `F:\PY\TG_bot_game\main.py` or create separate web server:

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

# Mount game files
app.mount("/game", StaticFiles(directory="../ball_game"), name="game")

@app.get("/")
async def serve_game():
    """Serve the main game page"""
    return FileResponse("../ball_game/full-track.html")

@app.get("/play/{seed}")
async def play_with_seed(seed: int):
    """Start game with specific seed for multiplayer"""
    # Return HTML with embedded seed
    return FileResponse("../ball_game/full-track.html")
```

### Step 2: Create Game API Endpoints

```python
from pydantic import BaseModel
from typing import Optional

class RaceResult(BaseModel):
    user_id: int
    seed: int
    slot_index: int
    multiplier: float
    timestamp: float

class CreateRace(BaseModel):
    bet_amount: float
    currency: str  # "TON" or "STARS"

@app.post("/api/race/create")
async def create_race(race: CreateRace, user_id: int):
    """Create a new race and return seed"""
    seed = generate_unique_seed()

    # Store in database
    race_id = await db.races.insert({
        "user_id": user_id,
        "seed": seed,
        "bet_amount": race.bet_amount,
        "currency": race.currency,
        "status": "pending",
        "created_at": datetime.now()
    })

    return {
        "race_id": race_id,
        "seed": seed,
        "webapp_url": f"https://yourdomain.com/play/{seed}"
    }

@app.post("/api/race/finish")
async def finish_race(result: RaceResult):
    """Record race result and calculate payout"""
    race = await db.races.get(seed=result.seed)

    if not race:
        raise HTTPException(404, "Race not found")

    payout = race.bet_amount * result.multiplier

    await db.races.update(race.id, {
        "status": "completed",
        "slot_index": result.slot_index,
        "multiplier": result.multiplier,
        "payout": payout,
        "finished_at": datetime.now()
    })

    # Update user balance
    await db.users.increment_balance(result.user_id, payout)

    return {
        "payout": payout,
        "new_balance": await db.users.get_balance(result.user_id)
    }

@app.get("/api/leaderboard")
async def get_leaderboard(period: str = "daily"):
    """Get top players by winnings"""
    return await db.get_leaderboard(period)
```

### Step 3: Modify Game Frontend

Create `full-track-telegram.html` (copy of `full-track.html` with Telegram integration):

```html
<script type="module">
  import { generateRandomTrack } from './src/trackGenerator.js';
  import { VisualEffectsManager } from './src/visualEffects.js';

  // Telegram WebApp API
  const tg = window.Telegram.WebApp;
  tg.expand(); // Full screen

  // Get seed from URL or Telegram data
  const urlParams = new URLSearchParams(window.location.search);
  const seed = parseInt(urlParams.get('seed')) || Math.floor(Math.random() * 1e9);
  const userId = tg.initDataUnsafe?.user?.id;

  // Generate track with seed
  const currentTrack = generateRandomTrack(Matter, engine, {
    width: W,
    height: H,
    seed: seed,
    onFinish: async (data) => {
      // Send result to backend
      try {
        const response = await fetch('/api/race/finish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            seed: seed,
            slot_index: data.slotIndex,
            multiplier: data.multiplier,
            timestamp: Date.now()
          })
        });

        const result = await response.json();

        // Show result to user
        tg.showAlert(`Виграш: ${result.payout} TON!\nБаланс: ${result.new_balance}`);

        // Close WebApp
        setTimeout(() => tg.close(), 3000);
      } catch (error) {
        console.error('Failed to submit result:', error);
        tg.showAlert('Помилка при збереженні результату');
      }
    }
  });

  // Auto-drop ball after 2 seconds
  setTimeout(() => {
    createBall();
  }, 2000);

  // Show seed to user
  tg.MainButton.setText(`Seed: ${seed}`);
  tg.MainButton.show();
</script>
```

### Step 4: Update Bot Handlers

In `F:\PY\TG_bot_game\bot_app\handlers\common.py`:

```python
from aiogram import Router, F
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.filters import Command

router = Router()

@router.message(Command("play"))
async def handle_play(message: Message):
    """Start a new marble race"""
    user_id = message.from_user.id

    # Get user balance
    balance = await db.users.get_balance(user_id)

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="🎮 Грати (1 TON)",
                web_app=WebAppInfo(url="https://yourdomain.com/game")
            )
        ],
        [
            InlineKeyboardButton(text="💰 Баланс", callback_data="balance"),
            InlineKeyboardButton(text="🏆 Рейтинг", callback_data="leaderboard")
        ]
    ])

    await message.answer(
        f"🎲 <b>Marble Race</b>\n\n"
        f"Твій баланс: <b>{balance} TON</b>\n\n"
        f"Натисни кнопку нижче щоб почати гонку!",
        reply_markup=keyboard
    )

@router.message(Command("balance"))
async def handle_balance(message: Message):
    """Show user balance and stats"""
    user_id = message.from_user.id
    stats = await db.users.get_stats(user_id)

    await message.answer(
        f"💰 <b>Твоя статистика</b>\n\n"
        f"Баланс: {stats.balance} TON\n"
        f"Зіграно ігор: {stats.games_played}\n"
        f"Виграшів: {stats.wins}\n"
        f"Найбільший виграш: x{stats.best_multiplier}\n"
        f"Всього виграно: {stats.total_winnings} TON"
    )

@router.message(Command("leaderboard"))
async def handle_leaderboard(message: Message):
    """Show top players"""
    leaders = await db.get_leaderboard("weekly", limit=10)

    text = "🏆 <b>ТОП-10 гравців тижня</b>\n\n"

    for i, player in enumerate(leaders, 1):
        emoji = ["🥇", "🥈", "🥉"][i-1] if i <= 3 else f"{i}."
        text += f"{emoji} {player.username}: {player.winnings} TON\n"

    await message.answer(text)
```

### Step 5: Database Schema

```sql
-- Users table
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    balance DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Races table
CREATE TABLE races (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    seed INTEGER NOT NULL,
    bet_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'TON',
    slot_index INTEGER,
    multiplier DECIMAL(4, 2),
    payout DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    finished_at TIMESTAMP
);

-- Leaderboard view
CREATE VIEW leaderboard_weekly AS
SELECT
    u.id,
    u.username,
    SUM(r.payout - r.bet_amount) as winnings,
    COUNT(*) as games_played
FROM users u
JOIN races r ON u.id = r.user_id
WHERE r.finished_at >= NOW() - INTERVAL '7 days'
GROUP BY u.id, u.username
ORDER BY winnings DESC;
```

## 🔐 Security Considerations

### 1. Validate Telegram Init Data

```python
import hmac
import hashlib

def validate_telegram_data(init_data: str, bot_token: str) -> bool:
    """Verify data came from Telegram"""
    data_check = init_data.split('&')
    data_check_dict = {}

    for item in data_check:
        key, value = item.split('=')
        if key != 'hash':
            data_check_dict[key] = value

    data_check_string = '\n'.join([f"{k}={v}" for k, v in sorted(data_check_dict.items())])
    secret_key = hmac.new("WebAppData".encode(), bot_token.encode(), hashlib.sha256).digest()
    hash_check = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    return hash_check == data_check_dict.get('hash')
```

### 2. Prevent Result Tampering

```python
# Server-side race validation
def validate_race_result(seed: int, slot_index: int) -> bool:
    """Verify slot index is plausible for given seed"""
    # Run headless simulation or use probability model
    # to ensure result is possible for this seed
    return True  # Implement actual validation

# Anti-cheat: rate limiting
@app.post("/api/race/finish")
@rate_limit(max_calls=10, period=60)  # Max 10 finishes per minute
async def finish_race(result: RaceResult):
    # ... existing code
```

### 3. Balance Protection

```python
async def create_race(race: CreateRace, user_id: int):
    # Ensure user has enough balance
    balance = await db.users.get_balance(user_id)
    if balance < race.bet_amount:
        raise HTTPException(400, "Insufficient balance")

    # Lock user balance during race
    await db.users.decrement_balance(user_id, race.bet_amount)

    # ... create race
```

## 🎮 Multiplayer Races

### Concept: Multiple users, same seed

```python
class MultiplayerRace(BaseModel):
    race_id: str
    participants: List[int]  # User IDs
    seed: int
    status: str  # "waiting", "active", "finished"

@app.post("/api/race/multiplayer/create")
async def create_multiplayer_race(bet_amount: float, max_players: int = 10):
    """Create a multiplayer race lobby"""
    seed = generate_unique_seed()
    race_id = str(uuid.uuid4())

    await db.multiplayer_races.insert({
        "race_id": race_id,
        "seed": seed,
        "bet_amount": bet_amount,
        "max_players": max_players,
        "participants": [],
        "status": "waiting"
    })

    return {"race_id": race_id, "seed": seed}

@app.post("/api/race/multiplayer/join/{race_id}")
async def join_multiplayer_race(race_id: str, user_id: int):
    """Join existing race lobby"""
    race = await db.multiplayer_races.get(race_id)

    if len(race.participants) >= race.max_players:
        raise HTTPException(400, "Race is full")

    # Deduct bet from user
    await db.users.decrement_balance(user_id, race.bet_amount)

    # Add to participants
    race.participants.append(user_id)
    await db.multiplayer_races.update(race_id, {"participants": race.participants})

    # Start race if full
    if len(race.participants) >= race.max_players:
        await db.multiplayer_races.update(race_id, {"status": "active"})
        # Notify all participants
        for uid in race.participants:
            await bot.send_message(uid, f"🚀 Гонка почалася! Seed: {race.seed}")

    return {"status": "joined", "participants": len(race.participants)}
```

## 📊 Analytics & Monitoring

```python
# Track important metrics
from prometheus_client import Counter, Histogram

races_started = Counter('races_started_total', 'Total races started')
races_finished = Counter('races_finished_total', 'Total races finished')
race_duration = Histogram('race_duration_seconds', 'Race completion time')
bet_amounts = Histogram('bet_amount_ton', 'Bet amounts in TON')

@app.post("/api/race/create")
async def create_race(...):
    races_started.inc()
    bet_amounts.observe(race.bet_amount)
    # ... rest of code

@app.post("/api/race/finish")
async def finish_race(...):
    races_finished.inc()
    duration = (result.timestamp - race.created_at.timestamp())
    race_duration.observe(duration)
    # ... rest of code
```

## 🚀 Deployment

### Docker Setup

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Copy game files
COPY ../ball_game /app/static/game

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /game/ {
        alias /app/static/game/;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}
```

## ✅ Testing Checklist

- [ ] WebApp loads correctly in Telegram
- [ ] User authentication works
- [ ] Balance deduction on race start
- [ ] Result submission successful
- [ ] Payout calculation correct
- [ ] Leaderboard updates
- [ ] Rate limiting prevents spam
- [ ] Seed validation works
- [ ] Error handling for network issues
- [ ] Mobile responsiveness

## 📚 Resources

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram WebApp Guide](https://core.telegram.org/bots/webapps)
- [TON Integration](https://docs.ton.org/develop/dapps/telegram-apps/)
- [aiogram Documentation](https://docs.aiogram.dev/)

---

**Next Steps**: Start with Step 1 (serving static files) and gradually add features.
