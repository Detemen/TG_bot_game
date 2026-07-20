// Prisma Client singleton

import { PrismaClient } from '@prisma/client';
import { env } from '../env.js';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
