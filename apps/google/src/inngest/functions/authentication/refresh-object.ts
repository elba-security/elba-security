import { inngest } from '@/inngest/client';
import { getGoogleServiceAccountClient } from '@/connectors/google/clients';
import { getGoogleUser } from '@/connectors/google/users';
import { formatUser } from '@/connectors/elba/users';
import { getElbaClient } from '@/connectors/elba/client';
import { getOrganisation } from '../common/get-organisation';

export type RefreshAuthenticationObjectEvents = {
  'google/authentication.refresh_object.requested': RefreshAuthenticationObjectRequested;
};

type RefreshAuthenticationObjectRequested = {
  data: {
    organisationId: string;
    userId: string;
  };
};

export const refreshAuthenticationObject = inngest.createFunction(
  {
    id: 'google-refresh-authentication-object',
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
  { event: 'google/authentication.refresh_object.requested' },
  async ({
    event: {
      data: { organisationId, userId },
    },
    step,
  }) => {
    const { region, googleAdminEmail } = await step.invoke('get-organisation', {
      function: getOrganisation,
      data: { organisationId, columns: ['region', 'googleAdminEmail'] },
    });

    const authClient = await getGoogleServiceAccountClient(googleAdminEmail, true);
    const user = await step.run('get-user', async () => {
      const googleUser = await getGoogleUser({ auth: authClient, userKey: userId });

      return formatUser(googleUser);
    });

    const elba = getElbaClient({ organisationId, region });
    await elba.users.update({ users: [user] });

    return { status: 'updated' };
  }
);
