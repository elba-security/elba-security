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
import { createSubscription } from './subscriptions/create-subscription';
import { refreshSubscription } from './subscriptions/refresh-subscription';
import { removeSubscription } from './subscriptions/remove-subscription';
import { removeOrganisation } from './organisations/remove-organisation';

// TODO: make sure every functions are here
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
  createSubscription,
  refreshSubscription,
  removeSubscription,
  removeOrganisation,
];
