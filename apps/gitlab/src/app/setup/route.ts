import type { NextRequest } from 'next/server';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/common/env';
import { setupOrganisation } from './service';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const organisationId = request.cookies.get('organisation_id')?.value;
  const region = request.cookies.get('region')?.value;
  const state = request.nextUrl.searchParams.get('state');
  const cookieState = request.cookies.get('state')?.value;

  if (!organisationId || !code || !region || state !== cookieState) {
    return new ElbaInstallRedirectResponse({
      region,
      baseUrl: env.ELBA_REDIRECT_URL,
      sourceId: env.ELBA_SOURCE_ID,
      error: code ? 'internal_error' : 'unauthorized',
    });
  }

  try {
    await setupOrganisation({ organisationId, code, region });

    return new ElbaInstallRedirectResponse({
      region,
      baseUrl: env.ELBA_REDIRECT_URL,
      sourceId: env.ELBA_SOURCE_ID,
    });
  } catch {
    return new ElbaInstallRedirectResponse({
      region,
      baseUrl: env.ELBA_REDIRECT_URL,
      sourceId: env.ELBA_SOURCE_ID,
      error: 'internal_error',
    });
  }
}
