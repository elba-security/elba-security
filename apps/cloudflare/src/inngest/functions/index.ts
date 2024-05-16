import { deleteCloudflareUser } from './users/delete-user';
import { scheduleUsersSyncs } from './users/schedule-user-sync';
import { syncUsersPage } from './users/sync-users-page';

export const inngestFunctions = [syncUsersPage, scheduleUsersSyncs, deleteCloudflareUser];
