import { removeOrganisation } from './organisations/remove-organisation';
import { refreshAppPermission } from './third-party-apps/refresh-app-permission';
import { revokeAppPermission } from './third-party-apps/revoke-app-permission';
import { scheduleAppsSyncs } from './third-party-apps/schedule-apps-syncs';
import { syncApps } from './third-party-apps/sync-apps';
import { refreshToken } from './token/refresh-token';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { syncUsers } from './users/sync-users';

export const inngestFunctions = [
  syncUsers,
  scheduleUsersSyncs,
  scheduleAppsSyncs,
  syncApps,
  refreshToken,
  removeOrganisation,
  refreshAppPermission,
  revokeAppPermission,
];
