import { removeOrganisation } from './organisation/remove-organisation';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { syncUsers } from './users/sync-users';
import { deleteUser } from './users/delete-users';
import { syncThirdPartyApps } from './third-party-apps/sync-third-party-apps';
import { refreshThirdPartyApp } from './third-party-apps/refresh-third-party-app';
import { deleteThirdPartyApp } from './third-party-apps/delete-third-party-app';
import { scheduleThirdPartyAppsSync } from './third-party-apps/schedule-third-party-apps-syncs';

export const inngestFunctions = [
  syncUsers,
  scheduleUsersSyncs,
  removeOrganisation,
  deleteUser,
  syncThirdPartyApps,
  refreshThirdPartyApp,
  deleteThirdPartyApp,
  scheduleThirdPartyAppsSync,
];
