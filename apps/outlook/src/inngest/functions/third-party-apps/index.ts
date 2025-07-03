import { type UpdateConnectionsObjects } from '@elba-security/schemas';
import { analyzeEmail, type AnalyzeEmailRequested } from './analyze-email';
import { scheduleThirdPartyAppsSync } from './schedule-sync';
import { syncThirdPartyApps, type SyncThirdPartyAppsRequested } from './sync';
import { syncMessages, type SyncMessagesRequested } from './sync-messages';

type SyncCancelEvent = {
  'outlook/sync.cancel': {
    data: {
      organisationId: string;
    };
  };
};

type ElbaUpdateConnectionsEvents = {
  'us/elba/connections.updated': {
    data: {
      sourceId: string;
    } & UpdateConnectionsObjects;
  };
  'eu/elba/connections.updated': {
    data: {
      sourceId: string;
    } & UpdateConnectionsObjects;
  };
};

export const thirdPartyAppsFunctions = [
  syncThirdPartyApps,
  syncMessages,
  analyzeEmail,
  scheduleThirdPartyAppsSync,
];

export type ThirdPartyAppsEvents = SyncThirdPartyAppsRequested &
  SyncMessagesRequested &
  SyncCancelEvent &
  ElbaUpdateConnectionsEvents &
  AnalyzeEmailRequested;
