import { scheduleTokenRefresh } from './users/schedule-token-refresh';
import { syncUsersPage } from './users/sync-users-page';
import { refreshZoomToken } from './users/zoom-refresh-user-token';
import { scheduleUsersSyncs } from './users/schedule-users.syncs';
import { deleteZoomUser } from './users/delete-user';

export const inngestFunctions = [
  deleteZoomUser,
  syncUsersPage,
  refreshZoomToken,
  scheduleTokenRefresh,
  scheduleUsersSyncs,
];
