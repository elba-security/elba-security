import { removeOrganisation } from './organisations/remove-organisation';
import { syncUsers } from './users/sync-users';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { deleteUser } from './users/delete-users';
import { refreshToken } from './token/refresh-token';
import { scheduleTokenRefresh } from './token/schedule-token-refresh';

export const inngestFunctions = [
  deleteUser,
  refreshToken,
  removeOrganisation,
  scheduleTokenRefresh,
  scheduleUsersSync,
  syncUsers,
];
