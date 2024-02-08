import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { inngestFunctions } from '@/inngest/functions';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
  // Remove the next line if your integration does not works with edge runtime
  streaming: 'allow',
});
