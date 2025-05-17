import { synchronizeUsers } from './users/sync-users';
import { scheduleUsersSynchronize } from './users/schedule-users-sync';
import { deleteUser } from './users/delete-user';
import { removeOrganisation } from './organisations/remove-organisation';

export const inngestFunctions = [
  synchronizeUsers,
  scheduleUsersSynchronize,
  deleteUser,
  removeOrganisation,
];
