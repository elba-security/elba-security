import { createOAuthRoute } from '@elba-security/nextjs';
import { env } from '@/env';
import { handleInstallation, searchParamsSchema } from './service';

export const dynamic = 'force-dynamic';

export const GET = createOAuthRoute({
  searchParamsSchema,
  elbaRedirectUrl: env.ELBA_REDIRECT_URL,
  elbaSourceId: env.ELBA_SOURCE_ID,
  handleInstallation,
});
