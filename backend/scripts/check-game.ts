import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGame() {
  try {
    // Get latest game
    const game = await prisma.game.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        bets: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!game) {
      console.log('No games found');
      return;
    }

    console.log('\n=== Latest Game ===');
    console.log('ID:', game.id);
    console.log('Status:', game.status);
    console.log('Seed:', game.seed);
    console.log('Difficulty:', game.difficulty);
    console.log('Pot TON:', game.potTon);
    console.log('Pot Stars:', game.potStars);
    console.log('Max Players:', game.maxPlayers);
    console.log('Ball Price TON:', game.ballPriceTon);
    console.log('Ball Price Stars:', game.ballPriceStars);
    console.log('Start Time:', game.startTime);
    console.log('Created At:', game.createdAt);

    console.log('\n=== Bets ===');
    console.log('Total bets:', game.bets.length);

    game.bets.forEach((bet, index) => {
      console.log(`\nBet ${index + 1}:`);
      console.log('  User:', bet.user.firstName, bet.user.username);
      console.log('  Ball Count:', bet.ballCount);
      console.log('  Amount TON:', bet.amountTon);
      console.log('  Amount Stars:', bet.amountStars);
      console.log('  Currency:', bet.currency);
      console.log('  Ball Colors:', bet.ballColors);
    });

    const totalBalls = game.bets.reduce((sum, bet) => sum + bet.ballCount, 0);
    console.log('\nTotal balls in game:', totalBalls);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGame();
