import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
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
    return new ElbaInstallRedirectResponse({
      error: 'internal_error',
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
    });
  }

  const state = crypto.randomUUID();

  cookies().set('organisation_id', organisationId);
  cookies().set('region', region);
  cookies().set('state', state);

  const redirectUrl = new URL(env.DROPBOX_APP_INSTALL_URL);
  redirectUrl.searchParams.append('client_id', env.DROPBOX_CLIENT_ID);
  redirectUrl.searchParams.append('redirect_uri', env.DROPBOX_REDIRECT_URI);
  redirectUrl.searchParams.append('token_access_type', 'offline');
  redirectUrl.searchParams.append('response_type', 'code');
  redirectUrl.searchParams.append('state', state);
  redirectUrl.searchParams.append('token_access_type', 'offline');

  redirect(redirectUrl.toString());
}
