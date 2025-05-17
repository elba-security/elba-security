import { inngest } from '@/inngest/client';
import { deleteUser as deleteSourceUser } from '@/connectors/jira/users';
import { env } from '@/common/env';
import { nangoConnectionConfigSchema, nangoCredentialsSchema } from '@/connectors/common/nango';
import { nangoAPIClient } from '@/common/nango';

export const deleteUser = inngest.createFunction(
  {
    id: 'jira-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.JIRA_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'jira/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'jira/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'jira/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials, connection_config: connectionConfig } =
      await nangoAPIClient.getConnection(nangoConnectionId);
    const nangoCredentialsResult = nangoCredentialsSchema.safeParse(credentials);
    if (!nangoCredentialsResult.success) {
      throw new Error('Could not retrieve Nango credentials');
    }
    const nangoConnectionConfigResult = nangoConnectionConfigSchema.safeParse(connectionConfig);
    if (!nangoConnectionConfigResult.success) {
      throw new Error('Could not retrieve Nango connection config data');
    }

    await deleteSourceUser({
      userId,
      apiToken: nangoCredentialsResult.data.password,
      domain: nangoConnectionConfigResult.data.subdomain,
      email: nangoCredentialsResult.data.username,
    });
  }
);
