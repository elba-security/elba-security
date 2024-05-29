import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { env } from '@/common/env';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');
  const region = request.nextUrl.searchParams.get('region');

  if (!organisationId || !region) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`);
  }

  const state = crypto.randomUUID();
  cookies().set('organisation_id', organisationId);
  cookies().set('region', region);
  cookies().set('state', state);

  const redirectUrl = new URL(`${env.INTERCOM_APP_INSTALL_URL}oauth?`);
  redirectUrl.searchParams.append('client_id', env.INTERCOM_CLIENT_ID);
  redirectUrl.searchParams.append('state', state);

  redirect(redirectUrl.toString());
}
