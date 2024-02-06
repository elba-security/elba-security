import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import type { MicrosoftApp } from '@/connectors/apps';
import { getApps } from '@/connectors/apps';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';

type ValidAppRole = { id: string; principalId: string };

const isValidAppRole = (
  appRole: MicrosoftApp['appRoleAssignedTo'][number]
): appRole is ValidAppRole => Boolean(appRole.principalId) && Boolean(appRole.id);

const formatApps = (app: MicrosoftApp) => ({
  id: app.id,
  name: app.appDisplayName,
  description: app.description ?? undefined,
  url: app.homepage ?? undefined,
  logoUrl: app.info?.logoUrl ?? undefined,
  publisherName: app.verifiedPublisher?.displayName ?? undefined,
  users: app.appRoleAssignedTo.filter(isValidAppRole).map((appRole) => ({
    id: appRole.principalId,
    scopes: app.oauth2PermissionScopes,
    metadata: { appRoleId: appRole.id },
  })),
});

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

    const elba = new Elba({
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      organisationId,
      region: organisation.region,
    });

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
        apps: result.validApps.map(formatApps),
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
