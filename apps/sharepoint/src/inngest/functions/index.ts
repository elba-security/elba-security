import { syncUsers } from './users/sync-users';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { refreshToken } from './token/refresh-token';
import { syncSites } from './data-protection/sync-sites';
import { syncDrives } from './data-protection/sync-drives';
import { syncItems } from './data-protection/sync-items';
import { scheduleDataProtectionSyncJobs } from './data-protection/schedule-sync-sites';
import { refreshItem } from './data-protection/refresh-item';
import { deleteDataProtectionItemPermissions } from './data-protection/delete-item-permissions';
import { initializeDelta } from './delta/initialize-delta';
import { updateItems } from './data-protection/update-items';
import { subscriptionToDrive } from './subscriptions/subscription-to-drives';
import { subscriptionRefresh } from './subscriptions/subscription-refresh';
import { subscriptionRemove } from './subscriptions/subscription-remove';

export const inngestFunctions = [
  syncUsers,
  scheduleUsersSyncs,
  refreshToken,
  syncSites,
  syncDrives,
  syncItems,
  scheduleDataProtectionSyncJobs,
  refreshItem,
  deleteDataProtectionItemPermissions,
  initializeDelta,
  updateItems,
  subscriptionToDrive,
  subscriptionRefresh,
  subscriptionRemove,
];
