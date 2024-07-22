import { inngest } from '@/inngest/client';
import { getGoogleServiceAccountClient } from '@/connectors/google/clients';
import { getGoogleToken } from '@/connectors/google/tokens';
import { formatApps } from '@/connectors/elba/third-party-apps';
import { getElbaClient } from '@/connectors/elba/client';
import { getOrganisation } from '../common/get-organisation';

export type RefreshThirdPartyAppsObjectEvents = {
  'google/third_party_apps.refresh_object.requested': RefreshThirdPartyAppsObjectRequested;
};

type RefreshThirdPartyAppsObjectRequested = {
  data: {
    organisationId: string;
    userId: string;
    appId: string;
  };
};

export const refreshThirdPartyAppsObject = inngest.createFunction(
  {
    id: 'google-refresh-third-party-apps-object',
    retries: 3,
    concurrency: {
      limit: 1,
    },
    cancelOn: [
      {
        event: 'google/common.organisation.inserted',
        match: 'data.organisationId',
      },
      {
        event: 'google/common.remove_organisation.requested',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'google/third_party_apps.refresh_object.requested' },
  async ({
    event: {
      data: { organisationId, userId, appId },
    },
    step,
  }) => {
    const { region, googleAdminEmail } = await step.invoke('get-organisation', {
      function: getOrganisation,
      data: { organisationId, columns: ['region', 'googleAdminEmail'] },
    });

    const authClient = await getGoogleServiceAccountClient(googleAdminEmail, true);

    const elba = getElbaClient({ organisationId, region });

    try {
      const googleApp = await getGoogleToken({
        auth: authClient,
        userKey: userId,
        clientId: appId,
      });

      const apps = formatApps([{ userId, apps: [googleApp] }]);

      await elba.thirdPartyApps.updateObjects({ apps });

      return { status: 'updated' };
      /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Start of error handling */
    } catch (error: any) {
      if (error?.code === 404 && error?.errors?.[0]?.reason === 'notFound') {
        /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- End of error handling */

        await elba.thirdPartyApps.deleteObjects({ ids: [{ userId, appId }] });

        return { status: 'deleted' };
      }

      throw error;
    }
  }
);
