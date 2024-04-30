import { syncUsers } from './users/sync-users';
import { scheduleUsersSync } from './users/schedule-users-sync';

export const inngestFunctions = [syncUsers, scheduleUsersSync];
