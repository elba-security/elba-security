import { type AnalyzeEmailRequested, analyzeEmail } from './analyze-email';
import { scheduleThirdPartyAppsSync } from './schedule-sync';
import { type SyncThirdPartyAppsRequested, syncThirdPartyApps } from './sync';
import { type SyncEmailRequested, syncEmail } from './sync-mail';
import { type SyncMessagesRequested, syncMessages } from './sync-messages';

type SyncCancelEvent = {
  'outlook/sync.cancel': {
    data: {
      organisationId: string;
    };
  };
};

export const thirdPartyAppsFunctions = [
  syncThirdPartyApps,
  syncMessages,
  analyzeEmail,
  scheduleThirdPartyAppsSync,
  syncEmail,
];

export type ThirdPartyAppsEvents = SyncThirdPartyAppsRequested &
  SyncMessagesRequested &
  SyncCancelEvent &
  AnalyzeEmailRequested &
  SyncEmailRequested;
