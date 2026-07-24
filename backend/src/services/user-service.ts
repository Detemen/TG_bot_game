import { Prisma, User, Currency } from "@prisma/client";
import prisma from "./prisma.js";
import { customAlphabet } from "nanoid";
import { DecimalString as D } from "../utils/decimal.js";

// Generate unique referral codes (8 chars, URL-safe)
const generateReferralCode = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  8
);

export interface CreateUserInput {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  tonAddress?: string;
  referrerCode?: string; // Code of user who referred this user
}

export interface UpdateBalanceInput {
  userId: string;
  amount: string;
  currency: Currency;
  operation: "add" | "subtract";
}

export class UserService {
  /**
   * Create a new user or return existing one
   */
  async createUser(input: CreateUserInput): Promise<User> {
    const { telegramId, username, firstName, lastName, tonAddress, referrerCode } = input;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (existingUser) {
      return existingUser;
    }

    // Generate unique referral code
    let referralCode = generateReferralCode();
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    while (attempts < MAX_ATTEMPTS) {
      const codeExists = await prisma.user.findUnique({
        where: { referralCode },
      });

      if (!codeExists) break;
      referralCode = generateReferralCode();
      attempts++;
    }

    if (attempts >= MAX_ATTEMPTS) {
      throw new Error("Failed to generate unique referral code");
    }

    // Find referrer if code provided
    let referrerId: string | null = null;
    if (referrerCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referrerCode },
      });
      if (referrer) {
        referrerId = referrer.id;
      }
    }

    // Create user with fun money starting balance
    const user = await prisma.user.create({
      data: {
        telegramId,
        username: username || null,
        firstName: firstName || null,
        lastName: lastName || null,
        tonAddress: tonAddress || null,
        referralCode,
        referrerId,
        balanceTon: "1000",
        balanceStars: 10000,
      },
    });

    return user;
  }

  /**
   * Get user by Telegram ID
   */
  async getUserByTelegramId(telegramId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { telegramId },
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Get user by referral code
   */
  async getUserByReferralCode(referralCode: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { referralCode },
    });
  }

  /**
   * Update user balance (add or subtract)
   */
  async updateBalance(input: UpdateBalanceInput): Promise<User> {
    const { userId, amount, currency, operation } = input;

    // Atomic balance update using Prisma $transaction (SQLite is serializable)
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      const currentBalance =
        currency === Currency.TON
          ? user.balanceTon
          : user.balanceStars.toString();

      let newBalance: string;
      if (operation === "add") {
        newBalance = D.add(currentBalance, amount);
      } else {
        newBalance = D.sub(currentBalance, amount);
        if (D.lessThan(newBalance, 0)) {
          throw new Error("Insufficient balance");
        }
      }

      return tx.user.update({
        where: { id: userId },
        data:
          currency === Currency.TON
            ? { balanceTon: newBalance }
            : { balanceStars: D.toNumber(newBalance) },
      });
    });
  }

  /**
   * Get user balance
   */
  async getBalance(userId: string): Promise<{ ton: string; stars: number }> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    return {
      ton: user.balanceTon,
      stars: user.balanceStars,
    };
  }

  /**
   * Update user TON address
   */
  async updateTonAddress(userId: string, tonAddress: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { tonAddress },
    });
  }

  /**
   * Update user stats after game completion
   */
  async updateGameStats(
    userId: string,
    isWin: boolean,
    earnings: string
  ): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        totalGames: user.totalGames + 1,
        totalWins: isWin ? user.totalWins + 1 : user.totalWins,
        totalEarned: D.add(user.totalEarned, earnings),
      },
    });
  }

  /**
   * Get user's referrals
   */
  async getReferrals(userId: string): Promise<User[]> {
    return prisma.user.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get user's referral stats
   */
  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    totalEarnings: string;
  }> {
    const referralsCount = await prisma.user.count({
      where: { referrerId: userId },
    });

    // `amount` is stored as a String (SQLite has no precise decimal type), so
    // Prisma can't `_sum` it — we fetch the rows and total them with Decimal.
    const earningRows = await prisma.referralEarning.findMany({
      where: { referrerId: userId },
      select: { amount: true },
    });

    const totalEarnings = earningRows.reduce(
      (total, { amount }) => D.add(total, amount),
      "0",
    );

    return {
      totalReferrals: referralsCount,
      totalEarnings,
    };
  }

  /**
   * Get leaderboard (top players by total earned)
   */
  async getLeaderboard(limit = 100): Promise<User[]> {
    return prisma.user.findMany({
      orderBy: { totalEarned: "desc" },
      take: limit,
    });
  }
}

// Export singleton instance
export const userService = new UserService();
