import { scheduleAppsSyncs } from './third-party-apps/schedule-apps-syncs';
import { syncAppsPage } from './third-party-apps/sync-apps-page';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { syncUsersPage } from './users/sync-users-page';

export const inngestFunctions = [
  syncUsersPage,
  scheduleUsersSyncs,
  syncAppsPage,
  scheduleAppsSyncs,
];
