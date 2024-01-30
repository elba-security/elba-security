import { serve } from 'inngest/next';
import { inngestFunctions } from '@/inngest/functions';
import { inngest } from '@/inngest/client';

export const dynamic = 'force-dynamic';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
