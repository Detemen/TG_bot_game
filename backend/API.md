# Marble Race API Documentation

Base URL: `http://localhost:4000`

## User Endpoints

### POST /users/register
Create or get user by Telegram ID.

**Request:**
```json
{
  "telegramId": "123456789",
  "username": "john_doe",
  "firstName": "John",
  "lastName": "Doe",
  "referrerCode": "ABC12345" // Optional
}
```

**Response:**
```json
{
  "id": "uuid",
  "telegramId": "123456789",
  "username": "john_doe",
  "firstName": "John",
  "referralCode": "XYZ98765",
  "balanceTon": "0",
  "balanceStars": 0
}
```

---

### GET /users/me?userId={userId}
Get current user profile with stats.

**Response:**
```json
{
  "id": "uuid",
  "telegramId": "123456789",
  "username": "john_doe",
  "balanceTon": "1.5",
  "balanceStars": 100,
  "referralCode": "XYZ98765",
  "totalGames": 10,
  "totalWins": 3,
  "totalEarned": "2.5",
  "referralStats": {
    "totalReferrals": 5,
    "totalEarnings": "0.25"
  }
}
```

---

### POST /users/deposit
Process deposit after payment verification.

**Request:**
```json
{
  "userId": "uuid",
  "amount": "1.0",
  "currency": "TON",
  "referenceId": "ton_tx_hash_123"
}
```

**Response:**
```json
{
  "transaction": {
    "id": "uuid",
    "type": "DEPOSIT_TON",
    "amount": "1.0",
    "currency": "TON",
    "status": "COMPLETED"
  },
  "newBalance": {
    "ton": "1.0",
    "stars": 0
  }
}
```

---

### POST /users/withdraw
Withdraw funds.

**Request:**
```json
{
  "userId": "uuid",
  "amount": "0.5",
  "currency": "TON",
  "tonAddress": "EQD..." // Required for TON
}
```

---

### GET /users/transactions?userId={userId}&limit=50
Get user transaction history.

---

### GET /users/stats?userId={userId}
Get user statistics (deposits, withdrawals, bets, winnings).

---

### GET /users/referrals?userId={userId}
Get user's referrals.

---

### GET /users/leaderboard?limit=100
Get top players by earnings.

---

## Game Endpoints

### GET /games
Get all active games (WAITING or STARTING).

**Response:**
```json
{
  "games": [
    {
      "id": "uuid",
      "seed": "abc123",
      "status": "WAITING",
      "difficulty": "medium",
      "potTon": "0.5",
      "potStars": 0,
      "maxPlayers": 60,
      "maxBallsPerPlayer": 10,
      "ballPriceTon": "0.1",
      "ballPriceStars": 10,
      "createdAt": "2025-01-18T10:00:00Z"
    }
  ]
}
```

---

### GET /games/finished?limit=50&offset=0
Get finished games with pagination.

---

### GET /games/:id
Get game details with bets and stats.

**Response:**
```json
{
  "id": "uuid",
  "seed": "abc123",
  "trackConfig": { ... },
  "status": "RUNNING",
  "potTon": "1.0",
  "bets": [
    {
      "userId": "uuid",
      "user": { "username": "john_doe" },
      "ballCount": 5,
      "amountTon": "0.5",
      "currency": "TON",
      "ballColors": ["hsl(0, 70%, 50%)", ...]
    }
  ],
  "stats": {
    "totalPlayers": 2,
    "totalBalls": 10,
    "totalPot": { "ton": "1.0", "stars": 0 },
    "avgBallsPerPlayer": 5
  }
}
```

---

### POST /games
Create a new game.

**Request:**
```json
{
  "difficulty": "medium",
  "maxPlayers": 60,
  "maxBallsPerPlayer": 10,
  "ballPriceTon": "0.1",
  "ballPriceStars": 10
}
```

---

### POST /games/:id/join
Join a game (buy balls).

**Request:**
```json
{
  "userId": "uuid",
  "ballCount": 5,
  "currency": "TON"
}
```

**Response:**
```json
{
  "game": {
    "id": "uuid",
    "status": "WAITING",
    "potTon": "0.5"
  },
  "bet": {
    "id": "uuid",
    "ballCount": 5,
    "amountTon": "0.5",
    "currency": "TON",
    "ballColors": ["hsl(0, 70%, 50%)", ...]
  }
}
```

**Notes:**
- Automatically starts countdown after first player joins
- Game starts after 30 seconds OR when all 60 balls are purchased
- Minimum 2 players required to start

---

### POST /games/:id/start
Manually start a game (admin only).

---

### POST /games/:id/finish
Finish a game and distribute winnings.

**Request:**
```json
{
  "winnerId": "uuid",
  "winnerBallId": 3,
  "winningTime": "45.234"
}
```

**Notes:**
- Winner receives 90% of pot
- 10% commission kept by system
- 5% referral bonus paid to referrer (if exists)

---

### POST /games/:id/cancel
Cancel a game and refund all bets.

---

### GET /games/history/user?userId={userId}&limit=50
Get user's game history.

---

## Game Flow

1. **User Registration:**
   - `POST /users/register` with Telegram data

2. **Deposit Funds:**
   - User pays via TON/Stars
   - Backend verifies payment
   - `POST /users/deposit` to credit balance

3. **Join Game:**
   - `GET /games` to see active games
   - `POST /games/:id/join` to buy balls
   - Game auto-starts after 30s or when full

4. **Play Game:**
   - WebSocket `/ws/game/:id` for real-time ball positions
   - Server runs physics simulation
   - First ball to finish = winner

5. **Finish Game:**
   - `POST /games/:id/finish` with winner data
   - 90% pot → winner
   - 10% → commission
   - 5% → referrer (if exists)
   - Auto-updates user balances

6. **Withdraw:**
   - `POST /users/withdraw` with TON address
   - Backend processes withdrawal

---

## Currency Support

- **TON:** Stored as `Decimal(18,9)` for precision
- **Telegram Stars:** Stored as `Int`

All amounts in API are strings (for decimals) or numbers (for stars).

---

## Authentication

Currently using `userId` query parameter.

**TODO:** Replace with proper JWT/Telegram WebApp authentication.

---

## Error Handling

All endpoints return errors in format:
```json
{
  "error": "Error message"
}
```

Common HTTP codes:
- `400` - Bad request (missing fields, invalid data)
- `404` - Resource not found
- `500` - Server error
