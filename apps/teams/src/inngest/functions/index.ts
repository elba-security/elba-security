import { tokenFunctions } from './tokens';
import { usersFunctions } from './users';
import { organisationsFunctions } from './organisations';
import { subscriptionsFunctions } from './subscriptions';
import { channelsFunctions } from './channels';
import { teamsFunctions } from './teams';
import { dataProtectionFunctions } from './data-protection';

export const inngestFunctions = [
  ...tokenFunctions,
  ...usersFunctions,
  ...organisationsFunctions,
  ...subscriptionsFunctions,
  ...channelsFunctions,
  ...teamsFunctions,
  ...dataProtectionFunctions,
];
