import { synchronizeUsers } from './users/sync-users';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { deleteUser } from './users/delete-user';
import { removeOrganisation } from './organisations/remove-organisation';

export const inngestFunctions = [
  removeOrganisation,
  synchronizeUsers,
  scheduleUsersSync,
  deleteUser,
];
