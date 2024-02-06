import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateWebhookRequestSignature } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { env } from '@/env';

export async function middleware(request: NextRequest) {
  try {
    await validateWebhookRequestSignature(request, env.ELBA_WEBHOOK_SECRET);
  } catch (error) {
    logger.error('Could not validate webhook request signature', { error, request });
    return new NextResponse(null, { status: 401, statusText: 'unauthorized' });
  }
}

export const config = {
  matcher: '/webhook/elba/:path*',
};
