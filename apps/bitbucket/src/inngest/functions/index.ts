import { syncUsersPage } from './users/sync-users-page';
import { handleRefreshToken } from './token/refresh-token';

export const inngestFunctions = [syncUsersPage, handleRefreshToken];
