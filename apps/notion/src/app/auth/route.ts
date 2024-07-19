import type { NextRequest } from 'next/server';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { setupOrganisation } from './service';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const stateParam = request.nextUrl.searchParams.get('state');
  const stateCookie = request.cookies.get('state')?.value;
  const code = request.nextUrl.searchParams.get('code');
  const organisationId = request.cookies.get('organisation_id')?.value;
  const region = request.cookies.get('region')?.value;

  if (!organisationId || !code || !region || !stateCookie || stateCookie !== stateParam) {
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'unauthorized',
    });
  }
  try {
    await setupOrganisation({ organisationId, code, region });
  } catch (error) {
    logger.error('Could not setup organisation', { error, organisationId });
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'internal_error',
    });
  }
  return new ElbaInstallRedirectResponse({
    region,
    sourceId: env.ELBA_SOURCE_ID,
    baseUrl: env.ELBA_REDIRECT_URL,
  });
}
