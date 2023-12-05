import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { inngestFunctions } from '@/inngest/functions';

export const runtime = 'edge';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
  // Remove the next line if your integration does not works with edge runtime
  streaming: 'allow',
});
