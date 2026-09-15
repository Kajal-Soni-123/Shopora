import { PrismaClient } from '@prisma/client';
import path from 'path';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

function getFreshPrismaClient(): PrismaClient {
  try {
    // Dynamic require using eval('require') bypasses Webpack module bundling cache
    // and reads the latest generated Prisma Client directly from node_modules/.prisma/client
    const nativeRequire = typeof eval !== 'undefined' ? eval('require') : require;
    const clientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
    
    if (nativeRequire.cache && nativeRequire.resolve) {
      try {
        const resolved = nativeRequire.resolve(clientPath);
        delete nativeRequire.cache[resolved];
      } catch {
        // Ignore resolution cache error if not cached yet
      }
    }
    
    const { PrismaClient: DynamicPrismaClient } = nativeRequire(clientPath);
    return new DynamicPrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } catch (e) {
    console.warn('Fallback to standard PrismaClient instantiation:', e);
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
}

export function getPrisma(): PrismaClient {
  let instance = globalForPrisma.prisma;
  if (!instance || typeof (instance as any).categoryRequest === 'undefined') {
    globalForPrisma.prisma = getFreshPrismaClient();
    instance = globalForPrisma.prisma!;
  }
  return instance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrisma();
    let delegate = (client as any)[prop];
    if (prop === 'categoryRequest' && typeof delegate === 'undefined') {
      delegate = (client as any).category_requests || (client as any).CategoryRequest;
    }
    if (typeof delegate === 'function') {
      return delegate.bind(client);
    }
    return delegate;
  },
});
