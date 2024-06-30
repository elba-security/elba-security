import { removeOrganisation } from './organisations/remove-organisation';
import { thirdPartyAppsFunctions } from './third-party-apps';
import { refreshToken } from './tokens/refresh-token';
import { usersFunctions } from './users';

export const inngestFunctions = [
  removeOrganisation,
  refreshToken,
  ...usersFunctions,
  ...thirdPartyAppsFunctions,
];
