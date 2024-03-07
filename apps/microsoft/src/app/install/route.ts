import { createInstallRoute } from '@elba-security/nextjs';
import { env } from '@/env';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const redirectUrl = new URL(env.MICROSOFT_INSTALL_URL);
redirectUrl.searchParams.append('client_id', env.MICROSOFT_CLIENT_ID);
redirectUrl.searchParams.append('redirect_uri', env.MICROSOFT_REDIRECT_URI);

export const GET = createInstallRoute({
  redirectUrl,
  elbaRedirectUrl: env.ELBA_REDIRECT_URL,
  elbaSourceId: env.ELBA_SOURCE_ID,
});
