import { serve } from 'inngest/next';
import { inngest } from '@/common/clients/inngest';
import * as tokens from './functions/tokens';
import * as users from './functions/users';
import * as dataProtection from './functions/data-protection';
import * as thirdPartyApps from './functions/third-party-apps';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [tokens, users, dataProtection, thirdPartyApps].flatMap((fn) => Object.values(fn)),
});
