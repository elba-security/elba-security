import { Elba } from 'elba-sdk';
import { env } from '@/common/env';
import { scanThirdPartyAppsByTenantId } from '@/repositories/microsoft/tpa';
import { inngest } from '../client';

export const scanThirdPartyApps = inngest.createFunction(
  {
    id: 'scan-third-party-apps',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
  },
  {
    event: 'third-party-apps/scan',
    rateLimit: {
      key: 'event.data.tenantId',
      limit: 1,
      period: '24h',
    },
  },
  async ({ event, step }) => {
    const { tenantId, syncStartedAt, organizationId, cursor, accessToken } = event.data;

    const elba = new Elba({
      apiKey: env.ELBA_API_KEY,
      organisationId: organizationId,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const { thirdPartyAppsObjects, pageLink } = await scanThirdPartyAppsByTenantId({
      accessToken,
      tenantId,
      pageLink: cursor,
    });

    if (thirdPartyAppsObjects.apps.length > 0) {
      await elba.thirdPartyApps.updateObjects({ apps: thirdPartyAppsObjects.apps });
    }

    if (pageLink) {
      await step.sendEvent('scan-third-party-apps', {
        name: 'third-party-apps/scan',
        data: {
          ...event.data,
          cursor: pageLink,
        },
      });
    } else {
      await step.run('finalize', () =>
        elba.thirdPartyApps.deleteObjects({ syncedBefore: syncStartedAt })
      );
      return {
        status: 'completed',
      };
    }

    return { status: 'ongoing' };
  }
);
