import {
  removeOrganisation,
  scheduleThirdPartyAppsSyncs,
  scheduleUsersSyncs,
} from '@elba-security/app-core/inngest';
import { inngest } from '../client';
import { syncAppsPage } from './third-party-apps/sync-apps-page';
import { syncUsersPage } from './users/sync-users-page';

export const inngestFunctions = [
  removeOrganisation(inngest),
  syncUsersPage,
  scheduleThirdPartyAppsSyncs(inngest),
  syncAppsPage,
  scheduleUsersSyncs(inngest),
];
