import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { userService } from "../services/user-service.js";
import { transactionService } from "../services/transaction-service.js";
import { Currency } from "@prisma/client";

interface UserIdParams {
  id: string;
}

interface DepositBody {
  amount: string; // Decimal as string
  currency: Currency;
  referenceId: string; // External transaction ID (TON hash, Stars payment ID)
  metadata?: Record<string, unknown>;
}

interface WithdrawBody {
  amount: string; // Decimal as string
  currency: Currency;
  tonAddress?: string; // Required for TON withdrawals
}

interface TransactionQuery {
  type?: string;
  status?: string;
  limit?: string;
  offset?: string;
}

export async function registerUserRoutes(app: FastifyInstance) {
  /**
   * Get current user profile
   * For now, we'll use a simple userId query param
   * TODO: Replace with proper authentication middleware
   */
  app.get("/me", async (request: FastifyRequest<{ Querystring: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.query;

      if (!userId) {
        return reply.code(400).send({ error: "userId is required" });
      }

      const user = await userService.getUserById(userId);
      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }

      // Get referral stats
      const referralStats = await userService.getReferralStats(userId);

      return reply.send({
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        tonAddress: user.tonAddress,
        balanceTon: user.balanceTon,
        balanceStars: user.balanceStars,
        referralCode: user.referralCode,
        totalGames: user.totalGames,
        totalWins: user.totalWins,
        totalEarned: user.totalEarned,
        referralStats: {
          totalReferrals: referralStats.totalReferrals,
          totalEarnings: referralStats.totalEarnings.toString(),
        },
        createdAt: user.createdAt,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Create or get user by Telegram ID
   */
  app.post("/register", async (
    request: FastifyRequest<{
      Body: {
        telegramId: string;
        username?: string;
        firstName?: string;
        lastName?: string;
        tonAddress?: string;
        referrerCode?: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { telegramId, username, firstName, lastName, tonAddress, referrerCode } = request.body;

      if (!telegramId) {
        return reply.code(400).send({ error: "telegramId is required" });
      }

      const user = await userService.createUser({
        telegramId: telegramId,
        username,
        firstName,
        lastName,
        tonAddress,
        referrerCode,
      });

      return reply.code(201).send({
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        referralCode: user.referralCode,
        balanceTon: user.balanceTon,
        balanceStars: user.balanceStars,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Process deposit (called after payment verification)
   */
  app.post("/deposit", async (
    request: FastifyRequest<{
      Body: DepositBody & { userId: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { userId, amount, currency, referenceId, metadata } = request.body;

      if (!userId || !amount || !currency || !referenceId) {
        return reply.code(400).send({ error: "Missing required fields" });
      }

      const transaction = await transactionService.processDeposit({
        userId,
        amount: String(amount),
        currency,
        referenceId,
        metadata,
      });

      const user = await userService.getUserById(userId);

      return reply.send({
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount.toString(),
          currency: transaction.currency,
          status: transaction.status,
          createdAt: transaction.createdAt,
        },
        newBalance: {
          ton: user?.balanceTon.toString(),
          stars: user?.balanceStars,
        },
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Process withdrawal
   */
  app.post("/withdraw", async (
    request: FastifyRequest<{
      Body: WithdrawBody & { userId: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { userId, amount, currency, tonAddress } = request.body;

      if (!userId || !amount || !currency) {
        return reply.code(400).send({ error: "Missing required fields" });
      }

      if (currency === Currency.TON && !tonAddress) {
        return reply.code(400).send({ error: "tonAddress is required for TON withdrawals" });
      }

      // Update TON address if provided
      if (tonAddress) {
        await userService.updateTonAddress(userId, tonAddress);
      }

      const transaction = await transactionService.processWithdrawal({
        userId,
        amount: String(amount),
        currency,
        metadata: { tonAddress },
      });

      const user = await userService.getUserById(userId);

      return reply.send({
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount.toString(),
          currency: transaction.currency,
          status: transaction.status,
          createdAt: transaction.createdAt,
        },
        newBalance: {
          ton: user?.balanceTon.toString(),
          stars: user?.balanceStars,
        },
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Get user transactions
   */
  app.get("/transactions", async (
    request: FastifyRequest<{
      Querystring: TransactionQuery & { userId: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { userId, type, status, limit, offset } = request.query;

      if (!userId) {
        return reply.code(400).send({ error: "userId is required" });
      }

      const transactions = await transactionService.getUserTransactions(userId, {
        type: type as any,
        status: status as any,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      });

      return reply.send({
        transactions: transactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount.toString(),
          currency: tx.currency,
          status: tx.status,
          gameId: tx.gameId,
          referenceId: tx.referenceId,
          createdAt: tx.createdAt,
          metadata: tx.metadata,
        })),
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Get user statistics
   */
  app.get("/stats", async (
    request: FastifyRequest<{
      Querystring: { userId: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { userId } = request.query;

      if (!userId) {
        return reply.code(400).send({ error: "userId is required" });
      }

      const stats = await transactionService.getStatistics(userId);

      return reply.send({
        totalDeposits: {
          ton: stats.totalDeposits.ton.toString(),
          stars: stats.totalDeposits.stars,
        },
        totalWithdrawals: {
          ton: stats.totalWithdrawals.ton.toString(),
          stars: stats.totalWithdrawals.stars,
        },
        totalBets: {
          ton: stats.totalBets.ton.toString(),
          stars: stats.totalBets.stars,
        },
        totalWinnings: {
          ton: stats.totalWinnings.ton.toString(),
          stars: stats.totalWinnings.stars,
        },
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Get user's referrals
   */
  app.get("/referrals", async (
    request: FastifyRequest<{
      Querystring: { userId: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { userId } = request.query;

      if (!userId) {
        return reply.code(400).send({ error: "userId is required" });
      }

      const referrals = await userService.getReferrals(userId);

      return reply.send({
        referrals: referrals.map((ref) => ({
          id: ref.id,
          username: ref.username,
          firstName: ref.firstName,
          totalGames: ref.totalGames,
          createdAt: ref.createdAt,
        })),
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Refill balance (fun money mode) — top up to 1000 if below 100
   */
  app.post("/refill", async (
    request: FastifyRequest<{
      Body: { userId: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { userId } = request.body;
      if (!userId) {
        return reply.code(400).send({ error: "userId is required" });
      }

      const user = await userService.getUserById(userId);
      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }

      const currentTon = parseFloat(user.balanceTon);
      if (currentTon >= 100) {
        return reply.send({
          message: "Balance sufficient",
          balanceTon: user.balanceTon,
          balanceStars: user.balanceStars,
        });
      }

      const updated = await userService.updateBalance({
        userId,
        amount: "1000",
        currency: Currency.TON,
        operation: "add",
      });
      await userService.updateBalance({
        userId,
        amount: "10000",
        currency: Currency.STARS,
        operation: "add",
      });

      const refreshed = await userService.getUserById(userId);

      return reply.send({
        message: "Balance refilled",
        balanceTon: refreshed?.balanceTon,
        balanceStars: refreshed?.balanceStars,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Get leaderboard
   */
  app.get("/leaderboard", async (
    request: FastifyRequest<{
      Querystring: { limit?: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { limit } = request.query;
      const topUsers = await userService.getLeaderboard(limit ? parseInt(limit) : undefined);

      return reply.send({
        leaderboard: topUsers.map((user, index) => ({
          rank: index + 1,
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          totalEarned: user.totalEarned.toString(),
          totalWins: user.totalWins,
          totalGames: user.totalGames,
          winRate: user.totalGames > 0 ? (user.totalWins / user.totalGames) * 100 : 0,
        })),
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });
}
