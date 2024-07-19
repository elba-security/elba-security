import { inngest } from '@/inngest/client';
import { getGoogleServiceAccountClient } from '@/connectors/google/clients';
import { deleteGoogleToken } from '@/connectors/google/tokens';
import { getOrganisation } from '../common/get-organisation';

export type DeleteThirdPartyAppsObjectEvents = {
  'google/third_party_apps.delete_object.requested': DeleteThirdPartyAppsObjectRequested;
};

type DeleteThirdPartyAppsObjectRequested = {
  data: {
    organisationId: string;
    userId: string;
    appId: string;
  };
};

export const deleteThirdPartyAppsObject = inngest.createFunction(
  {
    id: 'google-delete-third-party-apps-object',
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
  { event: 'google/third_party_apps.delete_object.requested' },
  async ({
    event: {
      data: { organisationId, userId, appId },
    },
    step,
  }) => {
    const { googleAdminEmail } = await step.invoke('get-organisation', {
      function: getOrganisation,
      data: { organisationId, columns: ['googleAdminEmail'] },
    });

    const authClient = await getGoogleServiceAccountClient(googleAdminEmail, true);
    await deleteGoogleToken({ auth: authClient, userKey: userId, clientId: appId });

    return { status: 'deleted' };
  }
);
