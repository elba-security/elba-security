import { eq } from 'drizzle-orm';
import type { ThirdPartyAppsObject } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { db } from '@/database/client';
import { env } from '@/env';
import type { OrganizationInstallation } from '@/connectors/github/organization';
import { getPaginatedOrganizationInstallations } from '@/connectors/github/organization';
import type { App } from '@/connectors/github/app';
import { getApp } from '@/connectors/github/app';
import { adminsTable } from '@/database/schema';
import { inngest } from '../../client';

const formatElbaAppScopes = (installationPermissions: OrganizationInstallation['permissions']) =>
  Object.entries(installationPermissions).map(([key, value]) => [key, value].join(':'));

const formatElbaApp = (
  app: App,
  installation: OrganizationInstallation,
  adminIds: string[]
): ThirdPartyAppsObject => {
  const scopes = formatElbaAppScopes(installation.permissions);
  return {
    id: `${installation.id}`,
    url: app.html_url,
    name: app.name,
    publisherName: app.owner?.name ?? undefined,
    description: app.description ?? undefined,
    users: adminIds.map((id) => ({
      id,
      scopes,
      createdAt: installation.created_at,
    })),
  };
};

export const syncAppsPage = inngest.createFunction(
  {
    id: 'github-sync-apps',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: env.THIRD_PARTY_APPS_MAX_RETRY,
    concurrency: [
      {
        limit: env.MAX_CONCURRENT_THIRD_PARTY_APPS_SYNC,
      },
      {
        key: 'event.data.installationId',
        limit: 1,
      },
    ],
    cancelOn: [
      {
        event: 'github/github.elba_app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'github/github.elba_app.installed',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'github/third_party_apps.page_sync.requested',
  },
  async ({ event, step }) => {
    const { installationId, organisationId, cursor, accountLogin, region } = event.data;
    const syncStartedAt = new Date(event.data.syncStartedAt);
    const elba = new Elba({
      organisationId,
      region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const adminIds = await step.run('initialize', async () => {
      const admins = await db
        .select({ id: adminsTable.id })
        .from(adminsTable)
        .where(eq(adminsTable.organisationId, organisationId));
      return admins.map(({ id }) => id);
    });

    const nextCursor = await step.run('paginate', async () => {
      const result = await getPaginatedOrganizationInstallations(
        installationId,
        accountLogin,
        cursor
      );

      const apps = await Promise.all(
        result.validInstallations
          .filter((appInstallation) => appInstallation.suspended_at === null)
          .map(async (appInstallation) => {
            const app = await getApp(installationId, appInstallation.app_slug);
            return formatElbaApp(app, appInstallation, adminIds);
          })
      );

      if (result.invalidInstallations.length) {
        logger.warn('Some retrieved apps data were invalids', {
          organisationId,
          invalidApps: result.invalidInstallations,
        });
      }

      if (result.validInstallations.length) {
        logger.info('Sending apps batch to elba', { organisationId, apps });
        await elba.thirdPartyApps.updateObjects({ apps });
      }
      return result.nextCursor;
    });

    if (nextCursor) {
      await step.sendEvent('sync-apps-page', {
        name: 'github/third_party_apps.page_sync.requested',
        data: {
          ...event.data,
          cursor: nextCursor,
        },
      });

      return {
        status: 'ongoing',
      };
    }

    await step.run('finalize', async () => {
      const syncedBefore = syncStartedAt.toISOString();
      logger.info('Deleting old users on elba', { organisationId, syncedBefore });
      await elba.thirdPartyApps.deleteObjects({ syncedBefore });
    });

    return {
      status: 'completed',
    };
  }
);
