import { syncUsers } from './users/sync-users';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { deleteUser } from './users/delete-user';

export const inngestFunctions = [syncUsers, scheduleUsersSync, deleteUser];
