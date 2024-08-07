import { removeOrganisation } from './organisations/remove-organisation';
import { refreshToken } from './token/refresh-token';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { syncUsers } from './users/sync-users';

export const inngestFunctions = [syncUsers, scheduleUsersSync, refreshToken, removeOrganisation];
