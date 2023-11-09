import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { env } from './common/env';

export function middleware(req: NextRequest) {
  if (req.headers.get('Authorization') !== `Bearer ${env.CRON_SECRET}`) {
    return new NextResponse('Invalid secret', {
      status: 401,
      statusText: 'Unauthorized',
    });
  }
}

export const config = {
  matcher: '/api/:path/cron/:path*',
};
