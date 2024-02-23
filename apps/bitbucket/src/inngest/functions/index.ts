import { syncUsers } from './users/sync-users';
import { handleRefreshToken } from './token/refresh-token';

export const inngestFunctions = [syncUsers, handleRefreshToken];
