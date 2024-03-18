import {
  removeOrganisation,
  scheduleUsersSyncs,
  scheduleThirdPartyAppsSyncs,
} from '@elba-security/app-core/inngest';
import { inngest } from '../client';
import { refreshAppPermission } from './third-party-apps/refresh-app-permission';
import { revokeAppPermission } from './third-party-apps/revoke-app-permission';
import { syncApps } from './third-party-apps/sync-apps';
import { refreshToken } from './token/refresh-token';
import { syncUsers } from './users/sync-users';

export const inngestFunctions = [
  scheduleUsersSyncs(inngest),
  scheduleThirdPartyAppsSyncs(inngest),
  removeOrganisation(inngest),
  refreshToken,
  syncApps,
  syncUsers,
  refreshAppPermission,
  revokeAppPermission,
];
