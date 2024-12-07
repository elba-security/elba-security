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

  cookies().set('organisation_id', organisationId);
  cookies().set('region', region);

  const redirectUrl = new URL(`${env.AIRSLATE_APP_INSTALL_URL}/authorize`);
  redirectUrl.searchParams.append('response_type', 'code');
  redirectUrl.searchParams.append('client_id', env.AIRSLATE_CLIENT_ID);
  redirectUrl.searchParams.append('client_secret', env.AIRSLATE_CLIENT_SECRET);
  redirectUrl.searchParams.append('redirect_uri', env.AIRSLATE_REDIRECT_URI);
  redirectUrl.searchParams.append('scope', 'email');

  cookies().set('redirect_url', redirectUrl.toString());

  redirect(redirectUrl.toString());
}
