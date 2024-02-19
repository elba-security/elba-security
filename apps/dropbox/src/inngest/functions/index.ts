import * as organisations from '@/inngest/functions/organisations';
import * as tokens from '@/inngest/functions/tokens';
import * as users from '@/inngest/functions/users';
import * as thirdPartyApps from '@/inngest/functions/third-party-apps';
import * as dataProtection from '@/inngest/functions/data-protection';

export const inngestFunctions = [
  organisations,
  tokens,
  users,
  thirdPartyApps,
  dataProtection,
].flatMap((fn) => Object.values(fn));
