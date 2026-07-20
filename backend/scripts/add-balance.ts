import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addBalance() {
  const telegramId = '272613682'; // Real user
  const amountToAdd = '100'; // 100 TON

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      console.log(`User with telegramId ${telegramId} not found`);
      return;
    }

    // Update balance
    const updatedUser = await prisma.user.update({
      where: { telegramId },
      data: {
        balanceTon: amountToAdd,
      },
    });

    console.log('✅ Balance updated successfully!');
    console.log(`User: ${updatedUser.username || updatedUser.firstName}`);
    console.log(`New balance: ${updatedUser.balanceTon} TON`);
  } catch (error) {
    console.error('Error updating balance:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addBalance();
