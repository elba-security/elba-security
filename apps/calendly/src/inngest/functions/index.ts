import { removeOrganisation } from './organisation/remove-organisation';
import { syncUsersPage } from './users/sync-users-page';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { deleteCalendlyUser } from './users/delete-user';
import { refreshToken } from './tokens/refresh-token';

export const inngestFunctions = [
  syncUsersPage,
  scheduleUsersSyncs,
  deleteCalendlyUser,
  refreshToken,
  removeOrganisation,
];
