import { analyzeEmail, type AnalyzeEmailRequested } from './analyze-email';
import { scheduleThirdPartyAppsSync } from './schedule-sync';
import { type SyncThirdPartyAppsRequested } from './sync';
import { syncThirdPartyApps } from './sync';
import { syncInbox, type SyncInboxRequested } from './sync-inbox';

export const thirdPartyAppsFunctions = [
  syncThirdPartyApps,
  analyzeEmail,
  syncInbox,
  scheduleThirdPartyAppsSync,
];

export type ThirdPartyAppsEvents = SyncThirdPartyAppsRequested &
  SyncInboxRequested &
  AnalyzeEmailRequested;
