import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Prisma client singleton. Next.js dev hot-reloads modules, which would
// otherwise spawn a new pooled client on every reload and exhaust Postgres
// connections; caching on globalThis in non-production avoids that.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
