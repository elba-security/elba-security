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
    `https://app.clickup.com/api?client_id=${env.CLICKUP_CLIENT_ID}&redirect_uri=${env.CLICKUP_REDIRECT_URI}
   `
  );
}
