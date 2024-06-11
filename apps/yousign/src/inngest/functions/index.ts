import { removeOrganisation } from './organisation/remove-organisation';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { syncUsers } from './users/sync-users';

export const inngestFunctions = [syncUsers, scheduleUsersSync, removeOrganisation];
