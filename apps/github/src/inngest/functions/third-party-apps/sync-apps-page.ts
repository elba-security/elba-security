import { eq } from 'drizzle-orm/sql';
import type { ThirdPartyAppsObject } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { db } from '@/database/client';
import { env } from '@/env';
import type { OrganizationInstallation } from '@/connectors/organization';
import { getPaginatedOrganizationInstallations } from '@/connectors/organization';
import type { App } from '@/connectors/app';
import { getApp } from '@/connectors/app';
import { Admin } from '@/database/schema';
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
    id: 'sync-apps',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: env.THIRD_PARTY_APPS_MAX_RETRY,
    idempotency:
      env.VERCEL_ENV && env.VERCEL_ENV !== 'development' ? 'event.data.installationId' : undefined,
    concurrency: [
      {
        limit: env.MAX_CONCURRENT_THIRD_PARTY_APPS_SYNC,
      },
      {
        key: 'event.data.installationId',
        limit: 1,
      },
    ],
  },
  {
    event: 'third-party-apps/page_sync.requested',
  },
  async ({ event, step }) => {
    const { installationId, organisationId, cursor, accountLogin } = event.data;
    const syncStartedAt = new Date(event.data.syncStartedAt);
    const elba = new Elba({
      organisationId,
      sourceId: env.ELBA_SOURCE_ID,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const adminIds = await step.run('initialize', async () => {
      const admins = await db
        .select({ id: Admin.id })
        .from(Admin)
        .where(eq(Admin.organisationId, organisationId));
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

      if (result.validInstallations.length) {
        await elba.thirdPartyApps.updateObjects({ apps });
      }
      return result.nextCursor;
    });

    if (nextCursor) {
      await step.sendEvent('sync-apps-page', {
        name: 'third-party-apps/page_sync.requested',
        data: {
          ...event.data,
          cursor: nextCursor,
        },
      });

      return {
        status: 'ongoing',
      };
    }

    await step.run('finalize', () =>
      elba.thirdPartyApps.deleteObjects({ syncedBefore: syncStartedAt.toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
