import type { NextRequest } from 'next/server';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { setupOrganisation } from './service';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const region = request.cookies.get('region')?.value;
  try {
    const code = request.nextUrl.searchParams.get('code');
    const organisationId = request.cookies.get('organisation_id')?.value;

    if (!organisationId || !code || !region) {
      return new ElbaInstallRedirectResponse({
        region,
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        error: 'unauthorized',
      });
    }

    await setupOrganisation({ organisationId, code, region });

    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL.toString(),
    });
  } catch (error) {
    logger.error('Could not install integration', { cause: error });
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL.toString(),
      error: 'internal_error',
    });
  }
}
