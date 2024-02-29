import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { env } from '@/env';

export const preferredRegion = env.VERCEL_PREFERRED_REGION;
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  try {
    const organisationId = request.nextUrl.searchParams.get('organisation_id');
    const region = request.nextUrl.searchParams.get('region');

    if (!organisationId || !region) {
      throw new Error('Could not retrieve organisationId or region from request');
    }

    // we store the organisationId in the cookies to be able to retrieve after the SaaS redirection
    cookies().set('organisation_id', organisationId);
    cookies().set('region', region);

    const redirectUrl = new URL(env.MONDAY_AUTH_URL);
    redirectUrl.searchParams.append('client_id', env.MONDAY_CLIENT_ID);
    redirect(redirectUrl.toString());
  } catch (error) {
    redirect(`${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`);
  }
}
