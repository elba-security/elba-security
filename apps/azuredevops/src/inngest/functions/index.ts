import { removeOrganisation } from './organisation/remove-organisation';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { syncUsers } from './users/sync-users';
import { refreshToken } from './token/refresh-token';
import { deleteUser } from './users/delete-users';
import { scheduleTokenRefresh } from './token/schedule-token-refresh';

export const inngestFunctions = [
  syncUsers,
  refreshToken,
  scheduleTokenRefresh,
  scheduleUsersSyncs,
  removeOrganisation,
  deleteUser,
];
