import { type CommonEvents, commonFunctions } from './common';
import { type UsersEvents, usersFunctions } from './users';
import { type ThirdPartyAppsEvents, thirdPartyAppsFunctions } from './third-party-apps';
import { type MicrosoftEvents, microsoftFunctions } from './microsoft';

export const inngestFunctions = [
  ...commonFunctions,
  ...usersFunctions,
  ...thirdPartyAppsFunctions,
  ...microsoftFunctions,
];

export type InngestEvents = CommonEvents & UsersEvents & ThirdPartyAppsEvents & MicrosoftEvents;
