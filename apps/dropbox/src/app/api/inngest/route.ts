import { serve } from 'inngest/next';
import { inngest } from '@/common/clients/inngest';
import * as tokens from './functions/tokens';
import * as users from './functions/users';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [tokens, users].flatMap((fn) => Object.values(fn)),
});
