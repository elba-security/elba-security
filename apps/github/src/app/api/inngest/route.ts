import { serve } from 'inngest/next';
import type { Inngest } from 'inngest';
import { inngestFunctions } from '@/inngest/functions';
import { inngest } from '@/inngest/client';

export const dynamic = 'force-dynamic';

export const { GET, POST, PUT } = serve({
  client: inngest as unknown as Inngest,
  functions: inngestFunctions,
});
