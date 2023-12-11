import { scheduleAppsSyncs } from './third-party-apps/schedule-apps-syncs';
import { syncApps } from './third-party-apps/sync-apps-page';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { syncUsers } from './users/sync-users-page';

export const inngestFunctions = [syncUsers, scheduleUsersSyncs, syncApps, scheduleAppsSyncs];
