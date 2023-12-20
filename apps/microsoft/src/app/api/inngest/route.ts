import { serve } from 'inngest/next';
import { inngest } from './client';
import { scheduleThirdPartyAppsScans } from './third-party-apps/schedule-third-party-apps-scans';
import { startUsersScan } from './users/start-users-scan';
import { scheduleUsersScans } from './users/schedule-users-scans';
import { startThirdPartyAppsScan } from './third-party-apps/start-third-party-apps-scan';
import { scanUsers } from './users/scan-users';
import { scanThirdPartyApps } from './third-party-apps/scan-third-party-apps';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    scheduleUsersScans,
    scheduleThirdPartyAppsScans,
    startUsersScan,
    startThirdPartyAppsScan,
    scanUsers,
    scanThirdPartyApps,
  ],
});
