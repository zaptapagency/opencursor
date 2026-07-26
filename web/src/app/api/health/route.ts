import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Railway health check target. Must run per-request (never cached/prerendered)
// and on the Node runtime so it can open a real DB connection.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      db: 'up',
      time: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('health check failed', {
      route: '/api/health',
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json(
      { status: 'error', db: 'down', time: new Date().toISOString() },
      { status: 503 },
    );
  }
}
