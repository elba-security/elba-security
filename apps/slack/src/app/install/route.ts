import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { getSlackInstallationUrl } from '@/connectors/slack/oauth';
import { env } from '@/common/env';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');
  const region = request.nextUrl.searchParams.get('region');
  const cookieStore = await cookies();

  if (!organisationId || !region) {
    logger.error('Failed to install slack, missing organisation id / region', {
      organisationId,
      region,
    });
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'internal_error',
    });
  }

  const state = crypto.randomUUID();
  const slackInstallationUrl = getSlackInstallationUrl(state);

  cookieStore.set('state', state);
  cookieStore.set('organisationId', organisationId);
  cookieStore.set('region', region);

  redirect(slackInstallationUrl);
}
