import { serve } from 'inngest/next';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { inngestFunctions } from '@/inngest/functions';

export const preferredRegion = env.VERCEL_PREFERRED_REGION;
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
  streaming: 'allow',
});
