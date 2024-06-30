import { scheduleAppsSync } from './schedule-apps-sync';
import { syncApps } from './sync-apps';
import { refreshThirdPartyAppsObject } from './refresh-objects';
import { deleteThirdPartyAppsObject } from './delete-object';

export const thirdPartyAppsFunctions = [
  scheduleAppsSync,
  syncApps,
  refreshThirdPartyAppsObject,
  deleteThirdPartyAppsObject,
];
