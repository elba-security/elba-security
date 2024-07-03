import { getAppOauthGrants } from './third-party-apps/get-app-oauth-grants';
import { inspectToken } from './debug/inspect-token';
import { refreshAppPermission } from './third-party-apps/refresh-app-permission';
import { refreshToken } from './token/refresh-token';
import { removeOrganisation } from './organisations/remove-organisation';
import { revokeAppPermission } from './third-party-apps/revoke-app-permission';
import { scheduleAppsSyncs } from './third-party-apps/schedule-apps-syncs';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { syncApps } from './third-party-apps/sync-apps';
import { syncUsers } from './users/sync-users';

export const inngestFunctions = [
  getAppOauthGrants,
  inspectToken,
  refreshAppPermission,
  refreshToken,
  removeOrganisation,
  revokeAppPermission,
  scheduleAppsSyncs,
  scheduleUsersSyncs,
  syncApps,
  syncUsers,
];
