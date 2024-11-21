import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/common/env';

export const preferredRegion = 'fra1';
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

  const url = new URL(env.MICROSOFT_INSTALL_URL);
  url.searchParams.append('client_id', env.MICROSOFT_CLIENT_ID);
  url.searchParams.append('redirect_uri', env.MICROSOFT_REDIRECT_URI);

  redirect(url.toString());
}
