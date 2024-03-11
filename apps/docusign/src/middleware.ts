import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateWebhookRequestSignature } from '@elba-security/sdk';
import { env } from '@/env';

export async function middleware(request: NextRequest) {
  try {
    await validateWebhookRequestSignature(request, env.ELBA_WEBHOOK_SECRET);
  } catch (error) {
    // TODO: add log
    return new NextResponse(null, { status: 401, statusText: 'unauthorized' });
  }
}

export const config = {
  matcher: '/webhook/elba/:path*',
};
