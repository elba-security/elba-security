import { removeOrganisation } from './organisations/remove-organisation';
import { syncUsers } from './users/sync-users';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { deleteUser } from './users/delete-users';
import { refreshToken } from './token/refresh-token';

export const inngestFunctions = [
  refreshToken,
  removeOrganisation,
  scheduleUsersSync,
  syncUsers,
  deleteUser,
];
