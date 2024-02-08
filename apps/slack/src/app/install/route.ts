import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { getRedirectUrl } from '@elba-security/sdk';
import { getSlackInstallationUrl } from '@/connectors/slack/oauth';
import { env } from '@/common/env';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const GET = (request: NextRequest) => {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');
  const region = request.nextUrl.searchParams.get('region');

  if (!organisationId || !region) {
    logger.error('Failed to install slack, missing organisation id / region', {
      organisationId,
      region,
    });
    redirect(
      getRedirectUrl({
        region: region ?? 'eu',
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        error: 'internal_error',
      })
    );
  }

  const state = crypto.randomUUID();
  const slackInstallationUrl = getSlackInstallationUrl(state);

  cookies().set('state', state);
  cookies().set('organisationId', organisationId);
  cookies().set('region', region);

  redirect(slackInstallationUrl);
};
