import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/common/env';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');
  const region = request.nextUrl.searchParams.get('region');
  const cookieStore = await cookies();

  if (!organisationId || !region) {
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'unauthorized',
    });
  }

  const state = crypto.randomUUID();
  cookieStore.set('organisation_id', organisationId);
  cookieStore.set('region', region);
  cookieStore.set('state', state);

  const redirectUrl = new URL(`${env.GUSTO_APP_INSTALL_URL}/authorize`);
  redirectUrl.searchParams.append('response_type', 'code');
  redirectUrl.searchParams.append('client_id', env.GUSTO_CLIENT_ID);
  redirectUrl.searchParams.append('redirect_uri', env.GUSTO_REDIRECT_URI);
  redirectUrl.searchParams.append('state', state);

  redirect(redirectUrl.toString());
};
