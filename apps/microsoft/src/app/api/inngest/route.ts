import { serve } from 'inngest/next';
import type { Inngest } from 'inngest';
import { inngest } from '@/inngest/client';
import { inngestFunctions } from '@/inngest/functions';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const { GET, POST, PUT } = serve({
  client: inngest as unknown as Inngest.Any,
  functions: inngestFunctions,
  // Remove the next line if your integration does not works with edge runtime
  streaming: 'allow',
});
