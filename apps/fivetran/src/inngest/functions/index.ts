import { synchronizeUsers } from './users/sync-users';
import { scheduleUsersSyncs } from './users/schedule-users-sync';
import { deleteSourceUser } from './users/delete-users';
import { removeOrganisation } from './organisations/remove-organisation';

export const inngestFunctions = [
  removeOrganisation,
  synchronizeUsers,
  scheduleUsersSyncs,
  deleteSourceUser,
];
