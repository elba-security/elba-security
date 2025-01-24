import { removeOrganisation } from './organisations/remove-organisation';
import { thirdPartyAppsFunctions } from './third-party-apps';
import { usersFunctions } from './users';
import { dataProtectionsFunctions } from './data-protections';

export const inngestFunctions = [
  removeOrganisation,
  ...usersFunctions,
  ...thirdPartyAppsFunctions,
  ...dataProtectionsFunctions,
];
