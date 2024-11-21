import { syncUsers } from './users/sync-users';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { removeOrganisation } from './organisations/remove-organisation';

export const inngestFunctions = [syncUsers, scheduleUsersSync, removeOrganisation];
