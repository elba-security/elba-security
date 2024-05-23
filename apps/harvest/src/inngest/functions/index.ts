import { syncUsersPage } from './users/sync-users-page';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { refreshToken } from './tokens/refresh-token';
import { deleteHarvestUser } from './users/delete-user';
import { removeOrganisation } from './organisation/remove-organisation';

export const inngestFunctions = [
  syncUsersPage,
  scheduleUsersSyncs,
  refreshToken,
  deleteHarvestUser,
  removeOrganisation,
];
