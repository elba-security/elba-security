import { syncUsersPage } from './users/sync-users';
import { syncUsers } from './users/start-users-sync';
import { scheduleUsersSyncs } from './users/schedule-users-sync';
import { removeOrganisation } from './organisation/remove-organisation';
import { deleteUsers } from './users/delete-user';

export const inngestFunctions = [
  syncUsersPage,
  syncUsers,
  scheduleUsersSyncs,
  deleteUsers,
  removeOrganisation,
];
