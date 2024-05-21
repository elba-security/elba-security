import type { DeleteThirdPartyAppsObjectEvents } from './delete-object';
import { deleteThirdPartyAppsObject } from './delete-object';
import type { RefreshThirdPartyAppsObjectEvents } from './refresh-object';
import { refreshThirdPartyAppsObject } from './refresh-object';
import { scheduleThirdPartyAppsSync } from './schedule-sync';
import type { SyncThirdPartyAppsEvents } from './sync';
import { syncThirdPartyApps } from './sync';

export type ThirdPartyAppsEvents = DeleteThirdPartyAppsObjectEvents &
  RefreshThirdPartyAppsObjectEvents &
  SyncThirdPartyAppsEvents;

export const thirdPartyAppsFunctions = [
  deleteThirdPartyAppsObject,
  refreshThirdPartyAppsObject,
  scheduleThirdPartyAppsSync,
  syncThirdPartyApps,
];
