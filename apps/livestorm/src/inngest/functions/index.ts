import { removeOrganisation } from './organisation/remove-organisation';
import { deleteLivestormUser } from './users/delete-user';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { syncUsersPage } from './users/sync-users';

export const inngestFunctions = [
  syncUsersPage,
  scheduleUsersSync,
  deleteLivestormUser,
  removeOrganisation,
];
