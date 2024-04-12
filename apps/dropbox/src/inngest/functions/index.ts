import { removeOrganisation } from '@/inngest/functions/organisations';
import { refreshToken } from '@/inngest/functions/tokens';
import { scheduleUserSync, syncUserPage } from '@/inngest/functions/users';
import {
  syncApps,
  scheduleAppsSync,
  refreshThirdPartyAppsObject,
  deleteThirdPartyAppsObject,
} from '@/inngest/functions/third-party-apps';
import {
  scheduleDataProtectionSyncJobs,
  deleteObjectPermissions,
  refreshObject,
  startFolderAndFileSync,
  startSharedLinkSync,
  synchronizeFoldersAndFiles,
  synchronizeSharedLinks,
} from '@/inngest/functions/data-protection';

export const inngestFunctions = [
  removeOrganisation,
  refreshToken,
  scheduleUserSync,
  syncUserPage,
  scheduleAppsSync,
  syncApps,
  refreshThirdPartyAppsObject,
  deleteThirdPartyAppsObject,
  synchronizeSharedLinks,
  startSharedLinkSync,
  startFolderAndFileSync,
  synchronizeFoldersAndFiles,
  refreshObject,
  deleteObjectPermissions,
  scheduleDataProtectionSyncJobs,
];
