import { NextResponse, type NextRequest } from 'next/server';

// DOC: https://nextjs.org/docs/app/building-your-application/routing/middleware
export function middleware(request: NextRequest) {
  const {
    url,
    nextUrl: { pathname },
  } = request;
  const { searchParams } = new URL(request.url);
  const organisationId = searchParams.get('organisation_id');

  if (organisationId && pathname === '/') {
    const response = NextResponse.next();
    response.cookies.set('organisationId', organisationId);
    return response;
  }

  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Invalid secret - Middle', {
      status: 401,
      statusText: 'Unauthorized',
    });
  }
}

export const config = {
  matcher: ['/', '/api/:path/cron/:path*'],
};
