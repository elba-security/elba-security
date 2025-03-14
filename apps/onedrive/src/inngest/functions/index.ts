import { syncUsers } from './users/sync-users';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { refreshToken } from './token/refresh-token';
import { syncDataProtection } from './data-protection/sync';
import { syncItems } from './data-protection/sync-items';
import { scheduleDataProtectionSyncJobs } from './data-protection/schedule-data-protection-sync';
import { refreshDataProtectionObject } from './data-protection/refresh-item';
import { deleteDataProtectionItemPermissions } from './data-protection/delete-item-permissions';
import { syncDeltaItems } from './data-protection/sync-delta-items';
import { refreshSubscription } from './subscriptions/refresh-subscription';
import { removeSubscription } from './subscriptions/remove-subscription';
import { removeOrganisation } from './organisations/remove-organisation';
import { getItemPermissions } from './data-protection/get-item-permission';
import { scheduleTokenRefresh } from './token/schedule-token-refresh';

export const inngestFunctions = [
  deleteDataProtectionItemPermissions,
  getItemPermissions,
  refreshDataProtectionObject,
  refreshSubscription,
  refreshToken,
  removeOrganisation,
  removeSubscription,
  scheduleDataProtectionSyncJobs,
  scheduleTokenRefresh,
  scheduleUsersSyncs,
  syncDataProtection,
  syncDeltaItems,
  syncItems,
  syncUsers,
];
