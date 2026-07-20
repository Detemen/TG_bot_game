import { Prisma, Game, GameStatus, Bet, Currency } from "@prisma/client";
import prisma from "./prisma.js";
import { userService } from "./user-service.js";
import { transactionService } from "./transaction-service.js";
import { generateTrackLayout } from "./track-generator.js";
import { createHash, randomBytes } from "crypto";
import { DecimalString as D } from "../utils/decimal.js";
import { botPlayerService } from "./bot-player-service.js";

const COMMISSION_RATE = 0.1; // 10% commission
const REFERRAL_BONUS_RATE = 0.05; // 5% referral bonus from bet amount
const GAME_START_DELAY = 10000; // 10 seconds — gives bots time to join
const MIN_PLAYERS = 2; // Require at least 2 players (bots fill remaining slots)

export interface CreateGameInput {
  difficulty?: "easy" | "medium" | "hard";
  maxPlayers?: number;
  maxBallsPerPlayer?: number;
  ballPriceTon?: string;
  ballPriceStars?: number;
}

export interface JoinGameInput {
  gameId: string;
  userId: string;
  ballCount: number;
  currency: Currency;
}

export interface FinishGameInput {
  gameId: string;
  winnerId: string;
  winnerBallId: number;
  winningTime: string;
}

export class GameService {
  private gameTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a new game with generated seed and track
   */
  async createGame(input: CreateGameInput = {}): Promise<Game> {
    const {
      difficulty = "medium",
      maxPlayers = 60,
      maxBallsPerPlayer = 10,
      ballPriceTon = "10",
      ballPriceStars = 100,
    } = input;

    // Generate unique seed for this game
    const seed = this.generateSeed();

    // Generate track layout from seed
    const trackConfig = generateTrackLayout({
      seed,
      difficulty,
      width: 420,
      height: 900,
    });

    // Create game
    const game = await prisma.game.create({
      data: {
        seed,
        trackConfig: trackConfig as any,
        difficulty,
        status: GameStatus.WAITING,
        maxPlayers,
        maxBallsPerPlayer,
        ballPriceTon,
        ballPriceStars,
      },
    });

    return game;
  }

  /**
   * Get game by ID with related data
   */
  async getGameById(
    gameId: string,
    includeRelations = false
  ): Promise<Game & { bets?: Bet[] } | null> {
    return prisma.game.findUnique({
      where: { id: gameId },
      include: includeRelations
        ? {
            bets: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    isBot: true,
                  },
                },
              },
            },
            winner: {
              select: {
                id: true,
                username: true,
                firstName: true,
                isBot: true,
              },
            },
          }
        : undefined,
    }) as any;
  }

  /**
   * Get all active games (waiting or starting)
   */
  async getActiveGames(): Promise<Game[]> {
    return prisma.game.findMany({
      where: {
        status: {
          in: [GameStatus.WAITING, GameStatus.STARTING],
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get finished games with pagination
   */
  async getFinishedGames(limit = 50, offset = 0): Promise<Game[]> {
    return prisma.game.findMany({
      where: { status: GameStatus.FINISHED },
      orderBy: { endTime: "desc" },
      take: limit,
      skip: offset,
      include: {
        winner: {
          select: {
            id: true,
            username: true,
            firstName: true,
          },
        },
      },
    });
  }

  /**
   * Join a game (buy balls)
   */
  async joinGame(input: JoinGameInput): Promise<{ game: Game; bet: Bet }> {
    const { gameId, userId, ballCount, currency } = input;

    // Get game and verify it's joinable
    const game = await this.getGameById(gameId, true);
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    if (game.status !== GameStatus.WAITING && game.status !== GameStatus.STARTING) {
      throw new Error(`Game is not accepting players: ${game.status}`);
    }

    // Verify user exists
    const user = await userService.getUserById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Validate ball count
    if (ballCount < 1 || ballCount > game.maxBallsPerPlayer) {
      throw new Error(`Ball count must be between 1 and ${game.maxBallsPerPlayer}`);
    }

    // Check total balls in game
    const totalBalls = (game.bets || []).reduce((sum, bet) => sum + bet.ballCount, 0);
    if (totalBalls + ballCount > game.maxPlayers) {
      throw new Error(`Game is full. Only ${game.maxPlayers - totalBalls} balls remaining`);
    }

    // Calculate bet amount
    const pricePerBall =
      currency === Currency.TON
        ? game.ballPriceTon
        : game.ballPriceStars.toString();
    const betAmount = D.mul(pricePerBall, ballCount);

    // Generate ball colors
    const ballColors = this.generateBallColors(ballCount);

    // Atomic: deduct balance + create bet + update pot
    const { updatedGame, bet } = await prisma.$transaction(async (tx) => {
      // Deduct user balance
      const currentBalance =
        currency === Currency.TON ? user.balanceTon : user.balanceStars.toString();
      if (D.lessThan(currentBalance, betAmount)) {
        throw new Error("Insufficient balance for bet");
      }
      await tx.user.update({
        where: { id: userId },
        data:
          currency === Currency.TON
            ? { balanceTon: D.sub(user.balanceTon, betAmount) }
            : { balanceStars: user.balanceStars - D.toNumber(betAmount) },
      });

      // Check user not already in game
      const existingBet = await tx.bet.findUnique({
        where: { gameId_userId: { gameId, userId } },
      });
      if (existingBet) {
        throw new Error("User already joined this game");
      }

      // Create bet transaction record
      const txRecord = await tx.transaction.create({
        data: {
          userId,
          type: "BET_PLACED",
          amount: betAmount,
          currency,
          gameId,
          status: "COMPLETED",
          metadata: { gameId },
        },
      });

      // Create bet
      const newBet = await tx.bet.create({
        data: {
          gameId,
          userId,
          ballCount,
          amountTon: currency === Currency.TON ? betAmount : "0",
          amountStars: currency === Currency.STARS ? D.toNumber(betAmount) : 0,
          currency,
          ballColors,
        },
      });

      // Update game pot
      const updGame = await tx.game.update({
        where: { id: gameId },
        data: {
          potTon:
            currency === Currency.TON
              ? D.add(game.potTon, betAmount)
              : game.potTon,
          potStars:
            currency === Currency.STARS
              ? game.potStars + D.toNumber(betAmount)
              : game.potStars,
        },
      });

      return { updatedGame: updGame, bet: newBet };
    });

    // Process referral bonus (outside transaction — non-critical)
    if (user.referrerId) {
      try {
        const bonusAmount = D.mul(betAmount, REFERRAL_BONUS_RATE);
        await transactionService.processReferralBonus({
          referrerId: user.referrerId,
          referredUserId: userId,
          gameId,
          amount: bonusAmount,
          currency,
          percentage: (REFERRAL_BONUS_RATE * 100).toString(),
        });
      } catch (e) {
        console.error("Referral bonus failed:", e);
      }
    }

    // If this is the first player, schedule game start + bots
    if ((game.bets?.length || 0) === 0) {
      this.scheduleGameStart(gameId);
    }

    // Check if we should start the game early (all slots filled)
    const newTotalBalls = totalBalls + ballCount;
    if (newTotalBalls >= game.maxPlayers) {
      await this.startGame(gameId);
    }

    return { game: updatedGame, bet };
  }

  /**
   * Schedule game start after delay, filling with bots first
   */
  private scheduleGameStart(gameId: string): void {
    // Add bots after a short delay (give real players time to join)
    const botTimer = setTimeout(async () => {
      try {
        const game = await this.getGameById(gameId, true);
        if (!game || game.status !== "WAITING") return;

        const humanCount = game.bets?.length || 0;
        // Add 1-3 bots so MIN_PLAYERS is met
        const botsNeeded = Math.max(MIN_PLAYERS - humanCount, 1);
        const added = await botPlayerService.fillGameWithBots(gameId, botsNeeded);
        console.log(`[GameService] Added ${added} bots to game ${gameId}`);
      } catch (err) {
        console.error(`[GameService] Failed to add bots to ${gameId}:`, err);
      }
    }, GAME_START_DELAY / 2); // Bots join at halfway point

    const timer = setTimeout(async () => {
      try {
        await this.startGame(gameId);
      } catch (error) {
        console.error(`Failed to start game ${gameId}:`, error);
      }
    }, GAME_START_DELAY);

    this.gameTimers.set(gameId, timer);
  }

  /**
   * Start a game (change status to RUNNING)
   */
  async startGame(gameId: string): Promise<Game> {
    const game = await this.getGameById(gameId, true);
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    if (game.status !== GameStatus.WAITING && game.status !== GameStatus.STARTING) {
      throw new Error(`Game cannot be started: ${game.status}`);
    }

    // Check minimum players
    const playerCount = game.bets?.length || 0;
    if (playerCount < MIN_PLAYERS) {
      // Cancel game and refund bets
      await this.cancelGame(gameId);
      throw new Error(`Not enough players. Minimum ${MIN_PLAYERS} required`);
    }

    // Clear timer if exists
    const timer = this.gameTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.gameTimers.delete(gameId);
    }

    // Update game status
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        status: GameStatus.RUNNING,
        startTime: new Date(),
      },
    });

    return updatedGame;
  }

  /**
   * Finish a game and distribute winnings
   */
  async finishGame(input: FinishGameInput): Promise<Game> {
    const { gameId, winnerId, winnerBallId, winningTime } = input;

    const game = await this.getGameById(gameId, true);
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    if (game.status !== GameStatus.RUNNING) {
      throw new Error(`Game is not running: ${game.status}`);
    }

    // Verify winner is a participant
    const winnerBet = game.bets?.find((bet) => bet.userId === winnerId);
    if (!winnerBet) {
      throw new Error(`Winner is not a participant in this game`);
    }

    // Update game status
    const finishedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        status: GameStatus.FINISHED,
        winnerId,
        winnerBallId,
        winningTime,
        endTime: new Date(),
      },
    });

    // Mark winner bet
    await prisma.bet.update({
      where: {
        gameId_userId: { gameId, userId: winnerId },
      },
      data: { isWinner: true },
    });

    // Distribute winnings
    await this.distributeWinnings(gameId);

    return finishedGame;
  }

  /**
   * Distribute winnings to winner (90% pot, 10% commission)
   */
  private async distributeWinnings(gameId: string): Promise<void> {
    const game = await this.getGameById(gameId);
    if (!game || !game.winnerId) {
      throw new Error("Game or winner not found");
    }

    // Calculate amounts (use TON or Stars depending on what was bet)
    const hasTonPot = D.greaterThan(game.potTon, 0);
    const currency = hasTonPot ? Currency.TON : Currency.STARS;
    const totalPot = hasTonPot
      ? game.potTon
      : game.potStars.toString();

    const commission = D.mul(totalPot, COMMISSION_RATE);
    const winnerPayout = D.sub(totalPot, commission);

    // Pay winner (90%)
    await transactionService.processWinPayout({
      userId: game.winnerId,
      gameId,
      amount: winnerPayout,
      currency,
    });

    // Update bet payout
    await prisma.bet.update({
      where: {
        gameId_userId: { gameId, userId: game.winnerId },
      },
      data: { payout: winnerPayout },
    });

    // Update winner stats
    await userService.updateGameStats(game.winnerId, true, winnerPayout);

    // Update losers stats
    const loserBets = await prisma.bet.findMany({
      where: {
        gameId,
        userId: { not: game.winnerId },
      },
    });

    for (const bet of loserBets) {
      await userService.updateGameStats(
        bet.userId,
        false,
        "0"
      );
    }

    // Record commission as a transaction for tracking
    await transactionService.createTransaction({
      userId: game.winnerId,
      type: "COMMISSION" as any,
      amount: commission,
      currency,
      gameId,
      metadata: { description: "Game commission 10%" },
    });
    console.log(`Game ${gameId} commission: ${commission} ${currency}`);
  }

  /**
   * Cancel a game and refund all bets
   */
  async cancelGame(gameId: string): Promise<Game> {
    const game = await this.getGameById(gameId, true);
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    // Clear timer if exists
    const timer = this.gameTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.gameTimers.delete(gameId);
    }

    // Refund all bets
    for (const bet of game.bets || []) {
      const refundAmount =
        bet.currency === Currency.TON ? bet.amountTon : bet.amountStars.toString();

      await userService.updateBalance({
        userId: bet.userId,
        amount: refundAmount,
        currency: bet.currency,
        operation: "add",
      });

      // Create refund transaction
      await transactionService.createTransaction({
        userId: bet.userId,
        type: bet.currency === Currency.TON ? "DEPOSIT_TON" as any : "DEPOSIT_STARS" as any,
        amount: refundAmount,
        currency: bet.currency,
        gameId,
        metadata: { reason: "game_cancelled" },
      });
    }

    // Update game status
    return prisma.game.update({
      where: { id: gameId },
      data: {
        status: GameStatus.CANCELLED,
        endTime: new Date(),
      },
    });
  }

  /**
   * Get user's game history
   */
  async getUserGameHistory(userId: string, limit = 50, offset = 0): Promise<Game[]> {
    return prisma.game.findMany({
      where: {
        bets: {
          some: { userId },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        winner: {
          select: {
            id: true,
            username: true,
          },
        },
        bets: {
          where: { userId },
        },
      },
    });
  }

  /**
   * Generate deterministic seed for game
   */
  private generateSeed(): string {
    const timestamp = Date.now().toString();
    const random = randomBytes(16).toString("hex");
    const combined = `${timestamp}-${random}`;
    return createHash("sha256").update(combined).digest("hex").substring(0, 16);
  }

  /**
   * Generate random colors for user's balls
   */
  private generateBallColors(count: number): string[] {
    const baseHue = Math.floor(Math.random() * 360);
    const colors: string[] = [];

    for (let i = 0; i < count; i++) {
      const hue = (baseHue + (i * 360) / count) % 360;
      const saturation = 70 + Math.random() * 30;
      const lightness = 50 + Math.random() * 10;
      colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }

    return colors;
  }

  /**
   * Get game statistics
   */
  async getGameStats(gameId: string): Promise<{
    totalPlayers: number;
    totalBalls: number;
    totalPot: { ton: Prisma.Decimal; stars: number };
    avgBallsPerPlayer: number;
  }> {
    const game = await this.getGameById(gameId, true);
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    const bets = game.bets || [];
    const totalPlayers = bets.length;
    const totalBalls = bets.reduce((sum, bet) => sum + bet.ballCount, 0);
    const avgBallsPerPlayer = totalPlayers > 0 ? totalBalls / totalPlayers : 0;

    return {
      totalPlayers,
      totalBalls,
      totalPot: {
        ton: game.potTon,
        stars: game.potStars,
      },
      avgBallsPerPlayer,
    };
  }

  /**
   * Cleanup - clear all timers
   */
  cleanup(): void {
    for (const timer of this.gameTimers.values()) {
      clearTimeout(timer);
    }
    this.gameTimers.clear();
  }
}

// Export singleton instance
export const gameService = new GameService();

// Cleanup on process exit
process.on("SIGINT", () => {
  gameService.cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  gameService.cleanup();
  process.exit(0);
});
