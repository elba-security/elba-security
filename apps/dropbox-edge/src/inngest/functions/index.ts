import { removeOrganisation } from './organisations/remove-organisation';
import { refreshToken } from './tokens/refresh-token';
import { usersFunctions } from './users';

export const inngestFunctions = [removeOrganisation, refreshToken, ...usersFunctions];
