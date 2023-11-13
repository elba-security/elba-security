import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // eslint-disable-next-line turbo/no-undeclared-env-vars -- TODO: retrieve env variable securely
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Invalid secret', {
      status: 401,
      statusText: 'Unauthorized',
    });
  }
}

export const config = {
  matcher: '/api/:path/cron/:path*',
};
