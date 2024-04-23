import { syncUsers } from './users/sync-users-page';
import { deleteUser } from './users/delete-user';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';

export const inngestFunctions = [syncUsers, deleteUser, scheduleUsersSyncs];
