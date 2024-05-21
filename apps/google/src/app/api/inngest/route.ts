import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { inngestFunctions } from '@/inngest/functions';

export const dynamic = 'force-dynamic';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
