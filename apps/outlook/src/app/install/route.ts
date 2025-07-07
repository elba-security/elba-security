import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/common/env/server';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');
  const region = request.nextUrl.searchParams.get('region');
  const cookieStore = await cookies();

  if (!organisationId || !region) {
    logger.warn('Could not redirect user to Microsoft app install url');
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'unauthorized',
    });
  }

  cookieStore.set('organisationId', organisationId);
  cookieStore.set('region', region);

  const url = new URL(env.OUTLOOK_INSTALL_URL);
  url.searchParams.append('client_id', env.OUTLOOK_AUTH_CLIENT_ID);
  url.searchParams.append('redirect_uri', env.OUTLOOK_AUTH_REDIRECT_URI);

  redirect(url.toString());
}
