import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import type { MicrosoftAppWithOauthGrants } from '@/connectors/microsoft/apps';
import { getApps } from '@/connectors/microsoft/apps';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';
import { formatApp } from '@/connectors/elba/third-party-apps/objects';
import { getAppOauthGrants } from './get-app-oauth-grants';

export const syncApps = inngest.createFunction(
  {
    id: 'microsoft-sync-apps',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    cancelOn: [
      {
        event: 'microsoft/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'microsoft/app.installed',
        match: 'data.organisationId',
      },
    ],
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: env.THIRD_PARTY_APPS_SYNC_MAX_RETRY,
  },
  {
    event: 'microsoft/third_party_apps.sync.requested',
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

    const { nextSkipToken, validApps } = await step.run('paginate', async () => {
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
      return {
        nextSkipToken: result.nextSkipToken,
        validApps: result.validApps,
      };
    });

    const appsWithOauthGrants = await Promise.all(
      validApps.map(async (app) => {
        const oauthGrants = await step.invoke(`get-app-oauth-grants-${app.id}`, {
          function: getAppOauthGrants,
          data: {
            organisationId,
            appId: app.id,
            skipToken: null,
          },
        });

        return { ...app, oauthGrants } as MicrosoftAppWithOauthGrants;
      })
    );

    await step.run('send-third-party-apps', async () => {
      await elba.thirdPartyApps.updateObjects({
        apps: appsWithOauthGrants.map(formatApp),
      });
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
