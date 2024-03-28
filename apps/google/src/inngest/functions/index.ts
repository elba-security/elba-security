import { authenticationFunctions, type AuthenticationEvents } from './authentication';
import type { CommonEvents } from './common';
import { commonFunctions } from './common';
import type { DataProtectionEvents } from './data-protection';
import { dataProtectionFunctions } from './data-protection';
import type { ThirdPartyAppsEvents } from './third-party-apps';
import { thirdPartyAppsFunctions } from './third-party-apps';
import type { UsersEvents } from './users';
import { usersFunctions } from './users';

export const inngestFunctions = [
  ...authenticationFunctions,
  ...commonFunctions,
  ...dataProtectionFunctions,
  ...thirdPartyAppsFunctions,
  ...usersFunctions,
];

export type InngestEvents = AuthenticationEvents &
  CommonEvents &
  DataProtectionEvents &
  ThirdPartyAppsEvents &
  UsersEvents;
