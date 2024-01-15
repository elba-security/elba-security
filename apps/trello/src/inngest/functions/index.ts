import { syncUsersPage } from './users/sync-users-page';
import { syncUsersCron } from './users/sync-users-page-cron';

export const inngestFunctions = [syncUsersPage, syncUsersCron];
