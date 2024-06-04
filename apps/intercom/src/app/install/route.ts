import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/common/env';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');
  const region = request.nextUrl.searchParams.get('region');

  if (!organisationId || !region) {
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'unauthorized',
    });
  }

  const state = crypto.randomUUID();
  cookies().set('organisation_id', organisationId);
  cookies().set('region', region);
  cookies().set('state', state);

  const redirectUrl = new URL(`${env.INTERCOM_APP_INSTALL_URL}`);
  redirectUrl.searchParams.append('response_type', 'code');
  redirectUrl.searchParams.append('client_id', env.INTERCOM_CLIENT_ID);
  redirectUrl.searchParams.append('state', state);

  redirect(redirectUrl.toString());
}
