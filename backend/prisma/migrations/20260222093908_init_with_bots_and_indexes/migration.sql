-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "telegram_id" TEXT NOT NULL,
    "username" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "ton_address" TEXT,
    "balance_ton" TEXT NOT NULL DEFAULT '0',
    "balance_stars" INTEGER NOT NULL DEFAULT 0,
    "referral_code" TEXT NOT NULL,
    "referrer_id" TEXT,
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "total_games" INTEGER NOT NULL DEFAULT 0,
    "total_wins" INTEGER NOT NULL DEFAULT 0,
    "total_earned" TEXT NOT NULL DEFAULT '0',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "users_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seed" TEXT NOT NULL,
    "track_config" JSONB NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "pot_ton" TEXT NOT NULL DEFAULT '0',
    "pot_stars" INTEGER NOT NULL DEFAULT 0,
    "winner_id" TEXT,
    "winner_ball_id" INTEGER,
    "winning_time" TEXT,
    "start_time" DATETIME,
    "end_time" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "max_players" INTEGER NOT NULL DEFAULT 60,
    "max_balls_per_player" INTEGER NOT NULL DEFAULT 10,
    "ball_price_ton" TEXT NOT NULL DEFAULT '0.1',
    "ball_price_stars" INTEGER NOT NULL DEFAULT 10,
    CONSTRAINT "games_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "game_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ball_count" INTEGER NOT NULL,
    "amount_ton" TEXT NOT NULL DEFAULT '0',
    "amount_stars" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "ball_colors" JSONB NOT NULL,
    "is_winner" BOOLEAN NOT NULL DEFAULT false,
    "payout" TEXT NOT NULL DEFAULT '0',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bets_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "game_id" TEXT,
    "reference_id" TEXT,
    "metadata" JSONB,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "referral_earnings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referrer_id" TEXT NOT NULL,
    "referred_user_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "percentage" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "games_seed_key" ON "games"("seed");

-- CreateIndex
CREATE INDEX "games_status_idx" ON "games"("status");

-- CreateIndex
CREATE INDEX "games_winner_id_idx" ON "games"("winner_id");

-- CreateIndex
CREATE INDEX "bets_game_id_idx" ON "bets"("game_id");

-- CreateIndex
CREATE INDEX "bets_user_id_idx" ON "bets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bets_game_id_user_id_key" ON "bets"("game_id", "user_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_type_idx" ON "transactions"("user_id", "type");

-- CreateIndex
CREATE INDEX "transactions_user_id_status_idx" ON "transactions"("user_id", "status");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_reference_id_idx" ON "transactions"("reference_id");

-- CreateIndex
CREATE INDEX "referral_earnings_referrer_id_idx" ON "referral_earnings"("referrer_id");
