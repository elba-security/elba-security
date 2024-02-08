import { scheduleTokenRefresh } from './users/schedule-token-refresh';
import { syncUsersPage } from './users/sync-users-page';
import { refreshZoomToken } from './users/zoom-refresh-user-token';
import { scheduleUsersSyncs } from './users/schedule-users.syncs';

export const inngestFunctions = [
  syncUsersPage,
  refreshZoomToken,
  scheduleTokenRefresh,
  scheduleUsersSyncs,
];
