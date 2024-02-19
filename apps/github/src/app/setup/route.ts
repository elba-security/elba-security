import { createOAuthRoute } from '@elba-security/app-core/nextjs';
import { inngest } from '@/inngest/client';
import { handleInstallation, searchParamsSchema } from './service';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const GET = createOAuthRoute({
  inngest,
  searchParamsSchema,
  handleInstallation,
});
