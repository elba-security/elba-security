import { removeOrganisation } from './organisations/remove-organisation';
import { syncUsers } from './users/sync-users';
import { scheduleUsersSync } from './users/schedule-users-sync';

export const inngestFunctions = [removeOrganisation, scheduleUsersSync, syncUsers];
