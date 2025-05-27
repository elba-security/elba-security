import { inngest } from '@/inngest/client';
import { deleteUser as deletePipedriveUser } from '@/connectors/pipedrive/users';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';
import { nangoRawCredentialsSchema } from '@/connectors/common/nango';

export const deleteUser = inngest.createFunction(
  {
    id: 'pipedrive-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.PIPEDRIVE_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'pipedrive/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

    const rawCredentials = nangoRawCredentialsSchema.parse(credentials.raw);

    await deletePipedriveUser({
      userId,
      accessToken: credentials.access_token,
      apiDomain: rawCredentials.api_domain,
    });
  }
);
