import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { env } from '@/common/env';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');
  const region = request.nextUrl.searchParams.get('region');

  if (!organisationId || !region) {
    throw new Error('Could not retrieve organisationId or region from request');
  }

  cookies().set('organisation_id', organisationId);
  cookies().set('region', region);

  const redirectUrl = new URL(env.MONDAY_AUTH_URL);
  redirectUrl.searchParams.append('client_id', env.MONDAY_CLIENT_ID);
  redirectUrl.searchParams.append('redirect_uri', env.MONDAY_REDIRECT_URL);

  redirect(redirectUrl.toString());
}
