import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { env } from './env';

export function middleware(req: NextRequest) {
  if (req.headers.get('Authorization') !== `Bearer ${env.CRON_SECRET}`) {
    return new NextResponse('Invalid api_key', {
      status: 401,
      statusText: 'Unauthorized',
    });
  }
}

export const config = {
  matcher: '/api/cron/:path*',
};
