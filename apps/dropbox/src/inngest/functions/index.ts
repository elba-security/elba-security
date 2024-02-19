import * as organisations from '@/inngest/functions/organisations';
import * as tokens from '@/inngest/functions/tokens';
import * as users from '@/inngest/functions/users';
import * as thirdPartyApps from '@/inngest/functions/third-party-apps';

export const inngestFunctions = [organisations, tokens, users, thirdPartyApps].flatMap((fn) =>
  Object.values(fn)
);
