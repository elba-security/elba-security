import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { getApps } from '@/connectors/microsoft/apps';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';
import { formatApp } from '@/connectors/elba/third-party-apps/objects';

export const syncApps = inngest.createFunction(
  {
    id: 'microsoft-sync-apps',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    cancelOn: [
      {
        event: 'microsoft/microsoft.elba_app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'microsoft/microsoft.elba_app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.THIRD_PARTY_APPS_SYNC_MAX_RETRY,
  },
  {
    event: 'microsoft/third_party_apps.sync.requested',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
  },
  async ({ event, step }) => {
    const { syncStartedAt, organisationId, skipToken } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
        tenantId: organisationsTable.tenantId,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient(organisationId, organisation.region);

    const nextSkipToken = await step.run('paginate', async () => {
      const result = await getApps({
        token: await decrypt(organisation.token),
        tenantId: organisation.tenantId,
        skipToken,
      });

      if (result.invalidApps.length > 0) {
        logger.warn('Retrieved apps contains invalid data', {
          organisationId,
          tenantId: organisation.tenantId,
          invalidApps: result.invalidApps,
        });
      }

      await elba.thirdPartyApps.updateObjects({
        apps: result.validApps.map(formatApp),
      });

      return result.nextSkipToken;
    });

    if (nextSkipToken) {
      await step.sendEvent('sync-next-apps-page', {
        name: 'microsoft/third_party_apps.sync.requested',
        data: {
          ...event.data,
          skipToken: nextSkipToken,
        },
      });

      return { status: 'ongoing' };
    }

    await step.run('finalize', () =>
      elba.thirdPartyApps.deleteObjects({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
