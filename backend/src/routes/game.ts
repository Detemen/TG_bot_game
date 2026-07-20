import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { gameService } from "../services/game-service.js";
import { Currency, Prisma } from "@prisma/client";

interface GameIdParams {
  id: string;
}

interface CreateGameBody {
  difficulty?: "easy" | "medium" | "hard";
  maxPlayers?: number;
  maxBallsPerPlayer?: number;
  ballPriceTon?: string;
  ballPriceStars?: number;
}

interface JoinGameBody {
  userId: string;
  ballCount: number;
  currency: Currency;
}

interface FinishGameBody {
  winnerId: string;
  winnerBallId: number;
  winningTime: string; // Decimal as string
}

interface GameHistoryQuery {
  userId: string;
  limit?: string;
  offset?: string;
}

export async function registerGameRoutes(app: FastifyInstance) {
  /**
   * Get all active games (waiting or starting)
   */
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const games = await gameService.getActiveGames();

      return reply.send({
        games: games.map((game) => ({
          id: game.id,
          seed: game.seed,
          status: game.status,
          difficulty: game.difficulty,
          potTon: game.potTon.toString(),
          potStars: game.potStars,
          maxPlayers: game.maxPlayers,
          maxBallsPerPlayer: game.maxBallsPerPlayer,
          ballPriceTon: game.ballPriceTon.toString(),
          ballPriceStars: game.ballPriceStars,
          createdAt: game.createdAt,
        })),
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Get finished games with pagination
   */
  app.get("/finished", async (
    request: FastifyRequest<{
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { limit, offset } = request.query;

      const games = await gameService.getFinishedGames(
        limit ? parseInt(limit) : undefined,
        offset ? parseInt(offset) : undefined
      );

      return reply.send({
        games: games.map((game) => ({
          id: game.id,
          seed: game.seed,
          status: game.status,
          difficulty: game.difficulty,
          potTon: game.potTon.toString(),
          potStars: game.potStars,
          winnerId: game.winnerId,
          winner: (game as any).winner,
          winningTime: game.winningTime?.toString(),
          startTime: game.startTime,
          endTime: game.endTime,
          createdAt: game.createdAt,
        })),
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Get game by ID with full details
   */
  app.get("/:id", async (
    request: FastifyRequest<{ Params: GameIdParams }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;

      const game = await gameService.getGameById(id, true);
      if (!game) {
        return reply.code(404).send({ error: "Game not found" });
      }

      // Get game stats
      const stats = await gameService.getGameStats(id);

      return reply.send({
        id: game.id,
        seed: game.seed,
        trackConfig: game.trackConfig,
        status: game.status,
        difficulty: game.difficulty,
        potTon: game.potTon.toString(),
        potStars: game.potStars,
        winnerId: game.winnerId,
        winner: (game as any).winner,
        winnerBallId: game.winnerBallId,
        winningTime: game.winningTime?.toString(),
        maxPlayers: game.maxPlayers,
        maxBallsPerPlayer: game.maxBallsPerPlayer,
        ballPriceTon: game.ballPriceTon.toString(),
        ballPriceStars: game.ballPriceStars,
        startTime: game.startTime,
        endTime: game.endTime,
        createdAt: game.createdAt,
        bets: (game.bets || []).map((bet) => ({
          id: bet.id,
          userId: bet.userId,
          user: (bet as any).user,
          ballCount: bet.ballCount,
          amountTon: bet.amountTon.toString(),
          amountStars: bet.amountStars,
          currency: bet.currency,
          ballColors: bet.ballColors,
          isWinner: bet.isWinner,
          payout: bet.payout.toString(),
        })),
        stats: {
          totalPlayers: stats.totalPlayers,
          totalBalls: stats.totalBalls,
          totalPot: {
            ton: stats.totalPot.ton.toString(),
            stars: stats.totalPot.stars,
          },
          avgBallsPerPlayer: stats.avgBallsPerPlayer,
        },
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Create a new game
   */
  app.post("/", async (
    request: FastifyRequest<{ Body: CreateGameBody }>,
    reply: FastifyReply
  ) => {
    try {
      const { difficulty, maxPlayers, maxBallsPerPlayer, ballPriceTon, ballPriceStars } =
        request.body;

      const game = await gameService.createGame({
        difficulty,
        maxPlayers,
        maxBallsPerPlayer,
        ballPriceTon,
        ballPriceStars,
      });

      return reply.code(201).send({
        id: game.id,
        seed: game.seed,
        trackConfig: game.trackConfig,
        status: game.status,
        difficulty: game.difficulty,
        potTon: game.potTon.toString(),
        potStars: game.potStars,
        maxPlayers: game.maxPlayers,
        maxBallsPerPlayer: game.maxBallsPerPlayer,
        ballPriceTon: game.ballPriceTon.toString(),
        ballPriceStars: game.ballPriceStars,
        createdAt: game.createdAt,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Join a game (buy balls)
   */
  app.post("/:id/join", async (
    request: FastifyRequest<{
      Params: GameIdParams;
      Body: JoinGameBody;
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const { userId, ballCount, currency } = request.body;

      if (!userId || !ballCount || !currency) {
        return reply.code(400).send({ error: "Missing required fields" });
      }

      if (ballCount < 1) {
        return reply.code(400).send({ error: "Ball count must be at least 1" });
      }

      const { game, bet } = await gameService.joinGame({
        gameId: id,
        userId,
        ballCount,
        currency,
      });

      return reply.send({
        game: {
          id: game.id,
          status: game.status,
          potTon: game.potTon.toString(),
          potStars: game.potStars,
        },
        bet: {
          id: bet.id,
          ballCount: bet.ballCount,
          amountTon: bet.amountTon.toString(),
          amountStars: bet.amountStars,
          currency: bet.currency,
          ballColors: bet.ballColors,
        },
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(400).send({ error: error.message });
    }
  });

  /**
   * Start a game manually (admin only)
   */
  app.post("/:id/start", async (
    request: FastifyRequest<{ Params: GameIdParams }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;

      const game = await gameService.startGame(id);

      return reply.send({
        id: game.id,
        status: game.status,
        startTime: game.startTime,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(400).send({ error: error.message });
    }
  });

  /**
   * Finish a game and distribute winnings
   */
  app.post("/:id/finish", async (
    request: FastifyRequest<{
      Params: GameIdParams;
      Body: FinishGameBody;
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const { winnerId, winnerBallId, winningTime } = request.body;

      if (!winnerId || winnerBallId === undefined || !winningTime) {
        return reply.code(400).send({ error: "Missing required fields" });
      }

      const game = await gameService.finishGame({
        gameId: id,
        winnerId,
        winnerBallId,
        winningTime: new Prisma.Decimal(winningTime),
      });

      return reply.send({
        id: game.id,
        status: game.status,
        winnerId: game.winnerId,
        winnerBallId: game.winnerBallId,
        winningTime: game.winningTime?.toString(),
        endTime: game.endTime,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(400).send({ error: error.message });
    }
  });

  /**
   * Cancel a game and refund bets
   */
  app.post("/:id/cancel", async (
    request: FastifyRequest<{ Params: GameIdParams }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;

      const game = await gameService.cancelGame(id);

      return reply.send({
        id: game.id,
        status: game.status,
        endTime: game.endTime,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(400).send({ error: error.message });
    }
  });

  /**
   * Get user's game history
   */
  app.get("/history/user", async (
    request: FastifyRequest<{ Querystring: GameHistoryQuery }>,
    reply: FastifyReply
  ) => {
    try {
      const { userId, limit, offset } = request.query;

      if (!userId) {
        return reply.code(400).send({ error: "userId is required" });
      }

      const games = await gameService.getUserGameHistory(
        userId,
        limit ? parseInt(limit) : undefined,
        offset ? parseInt(offset) : undefined
      );

      return reply.send({
        games: games.map((game) => ({
          id: game.id,
          seed: game.seed,
          status: game.status,
          difficulty: game.difficulty,
          potTon: game.potTon.toString(),
          potStars: game.potStars,
          winnerId: game.winnerId,
          winner: (game as any).winner,
          winningTime: game.winningTime?.toString(),
          startTime: game.startTime,
          endTime: game.endTime,
          createdAt: game.createdAt,
          myBet: (game as any).bets?.[0],
        })),
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });
}
