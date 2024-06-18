import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';
import { formatApp } from '@/connectors/elba/third-party-apps/objects';
import { getApp } from '@/connectors/microsoft/apps';
import { getOrganisation } from '@/inngest/common/organisations';
import { getAppOauthGrants } from './get-app-oauth-grants';

export const refreshAppPermission = inngest.createFunction(
  {
    id: 'microsoft-refresh-app-permission',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    cancelOn: [
      {
        event: 'microsoft/app.uninstalled',
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
  async ({ step, event }) => {
    const { organisationId, appId, userId } = event.data;

    const organisation = await getOrganisation(organisationId);

    const app = await step.run('get-app', async () =>
      getApp({
        tenantId: organisation.tenantId,
        token: await decrypt(organisation.token),
        appId,
      })
    );

    const elba = createElbaClient(organisationId, organisation.region);

    if (!app) {
      await elba.thirdPartyApps.deleteObjects({ ids: [{ appId, userId }] });
      return { status: 'deleted' };
    }

    const oauthGrants = await step.invoke(`get-app-oauth-grants`, {
      function: getAppOauthGrants,
      data: {
        organisationId,
        appId: app.id,
        skipToken: null,
      },
    });

    const elbaApp = formatApp({ ...app, oauthGrants });

    if (!elbaApp.users.some((user) => user.id === userId)) {
      await elba.thirdPartyApps.deleteObjects({ ids: [{ appId, userId }] });
      return { status: 'deleted' };
    }

    await elba.thirdPartyApps.updateObjects({ apps: [elbaApp] });
    return { status: 'updated' };
  }
);
