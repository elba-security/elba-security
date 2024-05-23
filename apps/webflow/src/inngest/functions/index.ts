import { syncUsersPage } from './users/sync-users-page';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { removeOrganisation } from './organisation/remove-organisation';
import { deleteWebflowUser } from './users/delete-user';

export const inngestFunctions = [
  syncUsersPage,
  scheduleUsersSyncs,
  deleteWebflowUser,
  removeOrganisation,
];
