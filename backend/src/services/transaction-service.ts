import { Prisma, Transaction, TransactionType, TransactionStatus, Currency } from "@prisma/client";
import prisma from "./prisma.js";
import { userService } from "./user-service.js";

export interface CreateTransactionInput {
  userId: string;
  type: TransactionType;
  amount: string;
  currency: Currency;
  gameId?: string;
  referenceId?: string; // External transaction ID (TON tx hash, Stars payment ID)
  metadata?: Record<string, unknown>;
}

export class TransactionService {
  /**
   * Create a new transaction
   */
  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const { userId, type, amount, currency, gameId, referenceId, metadata } = input;

    // Verify user exists
    const user = await userService.getUserById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type,
        amount,
        currency,
        gameId: gameId || null,
        referenceId: referenceId || null,
        metadata: metadata ? (metadata as any) : Prisma.JsonNull,
        status: TransactionStatus.PENDING,
      },
    });

    return transaction;
  }

  /**
   * Complete a transaction and update user balance
   */
  async completeTransaction(transactionId: string): Promise<Transaction> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new Error(`Transaction is not pending: ${transaction.status}`);
    }

    // Determine if this adds or subtracts from balance
    const creditTypes: TransactionType[] = [
      TransactionType.DEPOSIT_TON,
      TransactionType.DEPOSIT_STARS,
      TransactionType.WIN_PAYOUT,
      TransactionType.REFERRAL_BONUS,
    ];
    const isCredit = creditTypes.includes(transaction.type);

    const debitTypes: TransactionType[] = [
      TransactionType.WITHDRAW_TON,
      TransactionType.WITHDRAW_STARS,
      TransactionType.BET_PLACED,
      TransactionType.COMMISSION,
    ];
    const isDebit = debitTypes.includes(transaction.type);

    // Update user balance
    if (isCredit) {
      await userService.updateBalance({
        userId: transaction.userId,
        amount: transaction.amount,
        currency: transaction.currency,
        operation: "add",
      });
    } else if (isDebit) {
      await userService.updateBalance({
        userId: transaction.userId,
        amount: transaction.amount,
        currency: transaction.currency,
        operation: "subtract",
      });
    }

    // Update transaction status
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.COMPLETED,
        updatedAt: new Date(),
      },
    });

    return updatedTransaction;
  }

  /**
   * Fail a transaction
   */
  async failTransaction(transactionId: string, errorMessage: string): Promise<Transaction> {
    return prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.FAILED,
        errorMessage,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Cancel a transaction
   */
  async cancelTransaction(transactionId: string): Promise<Transaction> {
    return prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.CANCELLED,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string): Promise<Transaction | null> {
    return prisma.transaction.findUnique({
      where: { id },
    });
  }

  /**
   * Get transaction by reference ID (external tx hash)
   */
  async getTransactionByReferenceId(referenceId: string): Promise<Transaction | null> {
    return prisma.transaction.findFirst({
      where: { referenceId },
    });
  }

  /**
   * Get user's transactions
   */
  async getUserTransactions(
    userId: string,
    options?: {
      type?: TransactionType;
      status?: TransactionStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<Transaction[]> {
    const { type, status, limit = 50, offset = 0 } = options || {};

    return prisma.transaction.findMany({
      where: {
        userId,
        ...(type && { type }),
        ...(status && { status }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get pending transactions for user
   */
  async getPendingTransactions(userId: string): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.PENDING,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Process deposit (create transaction + complete it)
   */
  async processDeposit(input: {
    userId: string;
    amount: string;
    currency: Currency;
    referenceId: string;
    metadata?: Record<string, unknown>;
  }): Promise<Transaction> {
    const { userId, amount, currency, referenceId, metadata } = input;

    // Atomic: check + create + complete (prevents double-spending)
    return prisma.$transaction(async (tx) => {
      const existingTx = await tx.transaction.findFirst({
        where: { referenceId },
      });
      if (existingTx) {
        throw new Error(`Transaction already processed: ${referenceId}`);
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error(`User not found: ${userId}`);

      const type = currency === Currency.TON ? TransactionType.DEPOSIT_TON : TransactionType.DEPOSIT_STARS;
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type,
          amount,
          currency,
          referenceId,
          metadata: metadata ? (metadata as any) : Prisma.JsonNull,
          status: TransactionStatus.COMPLETED,
        },
      });

      // Credit balance
      await tx.user.update({
        where: { id: userId },
        data:
          currency === Currency.TON
            ? { balanceTon: new Prisma.Decimal(user.balanceTon).plus(amount).toString() }
            : { balanceStars: user.balanceStars + parseInt(amount) },
      });

      return transaction;
    });
  }

  /**
   * Process withdrawal (create transaction + complete it)
   */
  async processWithdrawal(input: {
    userId: string;
    amount: string;
    currency: Currency;
    metadata?: Record<string, unknown>;
  }): Promise<Transaction> {
    const { userId, amount, currency, metadata } = input;

    // Check user has sufficient balance
    const balance = await userService.getBalance(userId);
    const currentBalance = currency === Currency.TON ? balance.ton : balance.stars.toString();

    if (parseFloat(currentBalance) < parseFloat(amount)) {
      throw new Error("Insufficient balance for withdrawal");
    }

    // Create transaction
    const type = currency === Currency.TON ? TransactionType.WITHDRAW_TON : TransactionType.WITHDRAW_STARS;
    const transaction = await this.createTransaction({
      userId,
      type,
      amount,
      currency,
      metadata,
    });

    // Complete transaction (debits balance)
    return this.completeTransaction(transaction.id);
  }

  /**
   * Process bet placement
   */
  async processBet(input: {
    userId: string;
    gameId: string;
    amount: string;
    currency: Currency;
  }): Promise<Transaction> {
    const { userId, gameId, amount, currency } = input;

    // Check user has sufficient balance
    const balance = await userService.getBalance(userId);
    const currentBalance = currency === Currency.TON ? balance.ton : balance.stars.toString();

    if (parseFloat(currentBalance) < parseFloat(amount)) {
      throw new Error("Insufficient balance for bet");
    }

    // Create transaction
    const transaction = await this.createTransaction({
      userId,
      type: TransactionType.BET_PLACED,
      amount,
      currency,
      gameId,
      metadata: { gameId },
    });

    // Complete transaction (debits balance)
    return this.completeTransaction(transaction.id);
  }

  /**
   * Process win payout
   */
  async processWinPayout(input: {
    userId: string;
    gameId: string;
    amount: string;
    currency: Currency;
  }): Promise<Transaction> {
    const { userId, gameId, amount, currency } = input;

    // Create transaction
    const transaction = await this.createTransaction({
      userId,
      type: TransactionType.WIN_PAYOUT,
      amount,
      currency,
      gameId,
      metadata: { gameId },
    });

    // Complete transaction (credits balance)
    return this.completeTransaction(transaction.id);
  }

  /**
   * Process referral bonus
   */
  async processReferralBonus(input: {
    referrerId: string;
    referredUserId: string;
    gameId: string;
    amount: string;
    currency: Currency;
    percentage: string;
  }): Promise<{ transaction: Transaction; referralEarning: any }> {
    const { referrerId, referredUserId, gameId, amount, currency, percentage } = input;

    // Create referral earning record
    const referralEarning = await prisma.referralEarning.create({
      data: {
        referrerId,
        referredUserId,
        gameId,
        amount,
        currency,
        percentage,
      },
    });

    // Create transaction
    const transaction = await this.createTransaction({
      userId: referrerId,
      type: TransactionType.REFERRAL_BONUS,
      amount,
      currency,
      gameId,
      metadata: {
        referredUserId,
        percentage: percentage.toString(),
      },
    });

    // Complete transaction (credits balance)
    await this.completeTransaction(transaction.id);

    return { transaction, referralEarning };
  }

  /**
   * Get transaction statistics
   */
  async getStatistics(userId: string): Promise<{
    totalDeposits: { ton: Prisma.Decimal; stars: number };
    totalWithdrawals: { ton: Prisma.Decimal; stars: number };
    totalBets: { ton: Prisma.Decimal; stars: number };
    totalWinnings: { ton: Prisma.Decimal; stars: number };
  }> {
    const completedWhere = { userId, status: TransactionStatus.COMPLETED };

    const [depositsTon, depositsStars, withdrawTon, withdrawStars, betsTon, betsStars, winTon, winStars] = await Promise.all([
      prisma.transaction.aggregate({ where: { ...completedWhere, type: TransactionType.DEPOSIT_TON }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { ...completedWhere, type: TransactionType.DEPOSIT_STARS }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { ...completedWhere, type: TransactionType.WITHDRAW_TON }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { ...completedWhere, type: TransactionType.WITHDRAW_STARS }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { ...completedWhere, type: TransactionType.BET_PLACED, currency: Currency.TON }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { ...completedWhere, type: TransactionType.BET_PLACED, currency: Currency.STARS }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { ...completedWhere, type: TransactionType.WIN_PAYOUT, currency: Currency.TON }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { ...completedWhere, type: TransactionType.WIN_PAYOUT, currency: Currency.STARS }, _sum: { amount: true } }),
    ]);

    const toNum = (v: any) => parseInt(v?.toString() || "0");
    const toDec = (v: any) => new Prisma.Decimal(v?.toString() || "0");

    return {
      totalDeposits: { ton: toDec(depositsTon._sum.amount), stars: toNum(depositsStars._sum.amount) },
      totalWithdrawals: { ton: toDec(withdrawTon._sum.amount), stars: toNum(withdrawStars._sum.amount) },
      totalBets: { ton: toDec(betsTon._sum.amount), stars: toNum(betsStars._sum.amount) },
      totalWinnings: { ton: toDec(winTon._sum.amount), stars: toNum(winStars._sum.amount) },
    };
  }
}

// Export singleton instance
export const transactionService = new TransactionService();
