import { removeOrganisation } from './organisations/remove-organisation';
import { handleRefreshToken } from './token/refresh-token';
import { syncUsers } from './users/sync-users';

export const inngestFunctions = [syncUsers, handleRefreshToken, removeOrganisation];
