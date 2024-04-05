import type { NextRequest } from 'next/server';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { setupOrganisation } from './service';

export const preferredRegion = env.VERCEL_PREFERRED_REGION;
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * This route path can be changed to fit your implementation specificities.
 */
export async function GET(request: NextRequest) {
  const region = request.cookies.get('region')?.value;
  try {
    const code = request.nextUrl.searchParams.get('code');
    const organisationId = request.cookies.get('organisation_id')?.value;

    if (!organisationId || !code || !region) {
      return new ElbaInstallRedirectResponse({
        error: 'unauthorized',
        region,
        baseUrl: env.ELBA_REDIRECT_URL,
        sourceId: env.ELBA_SOURCE_ID,
      });
    }
    await setupOrganisation({ organisationId, code, region });
  } catch (error) {
    logger.error('Could not register organisation', { error });

    return new ElbaInstallRedirectResponse({
      error: 'internal_error',
      region,
      baseUrl: env.ELBA_REDIRECT_URL,
      sourceId: env.ELBA_SOURCE_ID,
    });
  }

  return new ElbaInstallRedirectResponse({
    region,
    baseUrl: env.ELBA_REDIRECT_URL,
    sourceId: env.ELBA_SOURCE_ID,
  });
}
