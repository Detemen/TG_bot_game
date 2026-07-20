import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        balanceTon: true,
        balanceStars: true,
      },
    });

    console.log(`Found ${users.length} users:`);
    console.log('');

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName || user.username || 'No name'}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Telegram ID: ${user.telegramId}`);
      console.log(`   Balance: ${user.balanceTon} TON, ${user.balanceStars} Stars`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
