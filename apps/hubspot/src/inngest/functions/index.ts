import { removeOrganisation } from './organisations/remove-organisation';
import { syncUsers } from './users/sync-users';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { refreshToken } from './token/refresh-token';
import { scheduleTimeZoneRefresh } from './timezone/schedule-timezone-refresh';
import { deleteUser } from './users/delete-user';

export const inngestFunctions = [
  refreshToken,
  removeOrganisation,
  scheduleUsersSync,
  syncUsers,
  scheduleTimeZoneRefresh,
  deleteUser,
];
