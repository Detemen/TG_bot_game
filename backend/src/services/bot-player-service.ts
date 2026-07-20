// Bot player service - creates and manages bot players that fill game slots

import prisma from "./prisma.js";
import { Currency } from "@prisma/client";
import { randomBytes } from "crypto";

const BOT_NAMES = [
  "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hank",
  "Ivy", "Jack", "Kate", "Leo", "Mia", "Nick", "Olivia", "Pete",
  "Quinn", "Rose", "Sam", "Tina", "Uma", "Victor", "Wendy", "Xander",
  "Yara", "Zack", "Luna", "Max", "Nora", "Oscar",
];

const BOT_TELEGRAM_ID_PREFIX = "bot_";

class BotPlayerService {
  /**
   * Get or create a bot user
   */
  async getOrCreateBot(index: number): Promise<{ id: string; telegramId: string }> {
    const telegramId = `${BOT_TELEGRAM_ID_PREFIX}${index}`;

    const existing = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true, telegramId: true },
    });

    if (existing) return existing;

    const name = BOT_NAMES[index % BOT_NAMES.length];
    const referralCode = randomBytes(8).toString("hex");

    const bot = await prisma.user.create({
      data: {
        telegramId,
        username: `${name}_bot`,
        firstName: name,
        isBot: true,
        balanceTon: "999999",
        balanceStars: 999999,
        referralCode,
      },
      select: { id: true, telegramId: true },
    });

    return bot;
  }

  /**
   * Add bot players to a game to fill it up to desired count
   */
  async fillGameWithBots(
    gameId: string,
    targetBotCount: number = 1
  ): Promise<number> {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { bets: true },
    });

    if (!game || (game.status !== "WAITING" && game.status !== "STARTING")) {
      return 0;
    }

    const existingPlayers = game.bets.length;
    const botsToAdd = Math.min(
      targetBotCount,
      game.maxPlayers - existingPlayers
    );

    if (botsToAdd <= 0) return 0;

    let addedCount = 0;

    for (let i = 0; i < botsToAdd; i++) {
      try {
        const bot = await this.getOrCreateBot(i);

        // Check if bot already in this game
        const existingBet = await prisma.bet.findUnique({
          where: { gameId_userId: { gameId, userId: bot.id } },
        });
        if (existingBet) continue;

        // Bot buys 1-3 balls randomly
        const ballCount = 1 + Math.floor(Math.random() * 3);
        const currency = Currency.TON;
        const betAmount = (parseFloat(game.ballPriceTon) * ballCount).toString();

        // Generate colors
        const baseHue = Math.floor(Math.random() * 360);
        const ballColors: string[] = [];
        for (let j = 0; j < ballCount; j++) {
          const hue = (baseHue + (j * 360) / ballCount) % 360;
          ballColors.push(`hsl(${hue}, 75%, 55%)`);
        }

        await prisma.$transaction(async (tx) => {
          // Deduct bot balance
          await tx.user.update({
            where: { id: bot.id },
            data: { balanceTon: { set: "999999" } }, // Bots have infinite money
          });

          // Create bet
          await tx.bet.create({
            data: {
              gameId,
              userId: bot.id,
              ballCount,
              amountTon: betAmount,
              amountStars: 0,
              currency,
              ballColors,
            },
          });

          // Update pot
          await tx.game.update({
            where: { id: gameId },
            data: {
              potTon: (
                parseFloat(game.potTon) + parseFloat(betAmount)
              ).toString(),
            },
          });

          // Create transaction record
          await tx.transaction.create({
            data: {
              userId: bot.id,
              type: "BET_PLACED",
              amount: betAmount,
              currency,
              gameId,
              status: "COMPLETED",
              metadata: { bot: true },
            },
          });
        });

        addedCount++;
        console.log(
          `[BotService] Bot ${bot.telegramId} joined game ${gameId} with ${ballCount} balls`
        );
      } catch (err) {
        console.error(`[BotService] Failed to add bot ${i}:`, err);
      }
    }

    return addedCount;
  }
}

export const botPlayerService = new BotPlayerService();
