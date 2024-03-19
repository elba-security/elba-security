import { createInstallRoute } from '@elba-security/nextjs';
import { env } from '@/env';

export const dynamic = 'force-dynamic';

export const GET = createInstallRoute({
  redirectUrl: env.GITHUB_APP_INSTALL_URL,
  elbaRedirectUrl: env.ELBA_REDIRECT_URL,
  elbaSourceId: env.ELBA_SOURCE_ID,
});
