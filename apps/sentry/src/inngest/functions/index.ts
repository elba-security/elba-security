import { removeOrganisation } from './organisation/remove-organisation';
import { deleteSentryUser } from './users/delete-user';
import { scheduleUsersSyncs } from './users/schedule-users-sync';
import { syncUsersPage } from './users/sync-users-page';

export const inngestFunctions = [
  syncUsersPage,
  scheduleUsersSyncs,
  deleteSentryUser,
  removeOrganisation,
];
