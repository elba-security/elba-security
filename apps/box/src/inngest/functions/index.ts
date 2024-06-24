import { refreshToken } from './token/refresh-token';
import { synchronizeUsers } from './users/synchronize-users';
import { scheduleUsersSynchronize } from './users/schedule-users-synchronize';
import { deleteUser } from './users/delete-user';
import { removeOrganisation } from './organisations/remove-organisation';

export const inngestFunctions = [
  refreshToken,
  synchronizeUsers,
  scheduleUsersSynchronize,
  deleteUser,
  removeOrganisation,
];
