import { syncUsersPage } from './users/sync-users';
import { syncUsers } from './users/start-users-sync';
import { scheduleUsersSyncs } from './users/schedule-users-sync';
import { removeOrganisation } from './organisation/remove-organisation';
import { deleteWebflowUser } from './users/delete-user';

export const inngestFunctions = [
  syncUsersPage,
  syncUsers,
  scheduleUsersSyncs,
  deleteWebflowUser,
  removeOrganisation,
];
