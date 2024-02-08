import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import * as tokens from '@/inngest/functions/tokens';
import * as users from '@/inngest/functions/users';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [tokens, users].flatMap((fn) => Object.values(fn)),
});
