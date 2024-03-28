import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/env';

export const preferredRegion = env.VERCEL_PREFERRED_REGION;
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');
  const region = request.nextUrl.searchParams.get('region');

  if (!organisationId || !region) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`);
  }

  cookies().set('state', organisationId);
  cookies().set('organisation_id', organisationId);
  cookies().set('region', region);

  return NextResponse.redirect(
    `https://id.heroku.com/oauth/authorize?client_id=${env.HEROKU_CLIENT_ID}&response_type=code&scope=global&state=${organisationId}`
  );
}
