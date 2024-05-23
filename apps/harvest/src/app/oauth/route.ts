import { type NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/env';
import { setupOrganisation } from './service';

export const preferredRegion = env.VERCEL_PREFERRED_REGION;
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const organisationId = request.cookies.get('organisation_id')?.value;
  const region = request.cookies.get('region')?.value;
  const cookieState = request.cookies.get('state')?.value;
  if (typeof code !== 'string' || state !== cookieState || !organisationId || !region) {
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
    logger.warn('Could not setup organisation after Harvest redirection', { error });
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'unauthorized',
    });
  }
}
