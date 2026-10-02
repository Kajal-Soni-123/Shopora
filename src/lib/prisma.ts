import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma: PrismaClient = (() => {
  if (!globalForPrisma.prisma || !(globalForPrisma.prisma as any).tryOnJob) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
})();

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma || !(globalForPrisma.prisma as any).tryOnJob) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}
