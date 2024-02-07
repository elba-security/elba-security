import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';
import { formatApp } from '@/connectors/elba/third-party-apps/objects';
import { getApp } from '@/connectors/microsoft/apps';

export const refreshAppPermission = inngest.createFunction(
  {
    id: 'microsoft-refresh-app-permission',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    cancelOn: [
      {
        event: 'microsoft/microsoft.elba_app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: env.THIRD_PARTY_APPS_REFRESH_APP_PERMISSION_MAX_RETRY,
  },
  {
    event: 'microsoft/third_party_apps.refresh_app_permission.requested',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 10,
    },
  },
  async ({ event }) => {
    const { organisationId, appId, userId } = event.data;

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

    const app = await getApp({
      tenantId: organisation.tenantId,
      token: await decrypt(organisation.token),
      appId,
    });

    const elba = createElbaClient(organisationId, organisation.region);

    if (!app) {
      await elba.thirdPartyApps.deleteObjects({ ids: [{ appId, userId }] });
    } else {
      await elba.thirdPartyApps.updateObjects({ apps: [formatApp(app)] });
    }
  }
);
