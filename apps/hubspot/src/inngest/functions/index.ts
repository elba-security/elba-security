import { removeOrganisation } from './organisations/remove-organisation';
import { syncUsers } from './users/sync-users';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { refreshToken } from './token/refresh-token';
import { scheduleTimeZoneRefresh } from './timezone/schedule-timezone-refresh';

export const inngestFunctions = [
  refreshToken,
  removeOrganisation,
  scheduleUsersSync,
  syncUsers,
  scheduleTimeZoneRefresh,
];
