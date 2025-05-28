import type { CommonEvents } from './common';
import { commonFunctions } from './common';
import type { UsersEvents } from './users';
import { usersFunctions } from './users';
import type { GmailEvents } from './gmail';
import { gmailFunctions } from './gmail';
import { type ThirdPartyAppsEvents, thirdPartyAppsFunctions } from './third-party-apps';

export const inngestFunctions = [
  ...commonFunctions,
  ...usersFunctions,
  ...gmailFunctions,
  ...thirdPartyAppsFunctions,
];

export type InngestEvents = CommonEvents & UsersEvents & GmailEvents & ThirdPartyAppsEvents;
