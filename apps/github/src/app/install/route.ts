import { createInstallRoute } from '@elba-security/app-core/nextjs';
import { env } from '@/env';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const GET = createInstallRoute({
  redirectUrl: env.GITHUB_APP_INSTALL_URL,
});
