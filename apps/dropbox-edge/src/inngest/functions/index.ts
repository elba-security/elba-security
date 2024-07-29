import { removeOrganisation } from './organisations/remove-organisation';
import { refreshToken } from './tokens/refresh-token';
import { usersFunctions } from './users';
import { dataProtectionsFunctions } from './data-protections';

export const inngestFunctions = [
  removeOrganisation,
  refreshToken,
  ...usersFunctions,
  ...dataProtectionsFunctions,
];
