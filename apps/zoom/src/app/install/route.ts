import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from '@/env';

// Remove the next line if your integration does not works with edge runtime
export const preferredRegion = env.VERCEL_PREFERRED_REGION;
// Remove the next line if your integration does not works with edge runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');
  const region = request.nextUrl.searchParams.get('region');

  if (!organisationId || !region) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`);
  }

  // we store the organisationId in the cookies to be able to retrieve after the SaaS redirection
  cookies().set('organisation_id', organisationId);
  cookies().set('region', region);

  const zoomLoginUrl = new URL(env.ZOOM_LOGIN_URL);
  zoomLoginUrl.searchParams.append('client_id', env.ZOOM_CLIENT_KEY);
  zoomLoginUrl.searchParams.append('response_type', 'code');
  zoomLoginUrl.searchParams.append('redirect_uri', env.ZOOM_REDIRECT_URL);
  // we redirect the user to the installation page of the SaaS application

  return redirect(zoomLoginUrl.toString());
}
