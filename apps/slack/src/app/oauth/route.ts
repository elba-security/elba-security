import { createOAuthRoute } from '@elba-security/nextjs';
import { env } from '@/common/env';
import { handleSlackInstallation, searchParamsSchema } from './service';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const GET = createOAuthRoute({
  searchParamsSchema,
  handleInstallation: handleSlackInstallation,
  elbaSourceId: env.ELBA_SOURCE_ID,
  elbaRedirectUrl: env.ELBA_REDIRECT_URL,
  withState: true,
});
