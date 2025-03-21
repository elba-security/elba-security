import { refreshToken } from './token/refresh-token';
import { synchronizeUsers } from './users/sync-users';
import { scheduleUsersSynchronize } from './users/schedule-users-sync';
import { deleteUser } from './users/delete-user';
import { removeOrganisation } from './organisations/remove-organisation';
import { scheduleTokenRefresh } from './token/schedule-token-refresh';

export const inngestFunctions = [
  deleteUser,
  refreshToken,
  removeOrganisation,
  scheduleTokenRefresh,
  scheduleUsersSynchronize,
  synchronizeUsers,
];
