import { createInstallRoute } from '@elba-security/nextjs';
import { getSlackInstallationUrl } from '@/connectors/slack/oauth';
import { env } from '@/common/env';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const GET = createInstallRoute({
  elbaSourceId: env.ELBA_SOURCE_ID,
  elbaRedirectUrl: env.ELBA_REDIRECT_URL,
  redirectUrl: getSlackInstallationUrl(),
  withState: true,
});
