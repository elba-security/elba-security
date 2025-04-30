import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/pipedrive/users';
import { type PipedriveUser } from '@/connectors/pipedrive/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoRawCredentialsSchema } from '@/connectors/common/nango';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUser = ({ user, apiDomain }: { user: PipedriveUser; apiDomain: string }): User => ({
  id: String(user.id),
  displayName: user.name,
  email: user.email,
  additionalEmails: [],
  role: user.is_admin === 1 ? 'admin' : 'user',
  isSuspendable: !user.is_you,
  url: `${apiDomain}/users/details/${user.id}/updates`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'pipedrive-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'pipedrive/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'pipedrive/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'pipedrive/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');
      const rawCredentials = nangoRawCredentialsSchema.parse(credentials.raw);

      const apiDomain = rawCredentials.api_domain;
      const result = await getUsers({ accessToken: credentials.access_token, page, apiDomain });

      const users = result.validUsers
        .filter(({ active_flag: active }) => active)
        .map((user) => formatElbaUser({ user, apiDomain }));

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          invalidUsers: result.invalidUsers,
        });
      }

      if (users.length > 0) {
        await elba.users.update({ users });
      }

      return result.nextPage;
    });

    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'pipedrive/users.sync.requested',
        data: {
          ...event.data,
          page: String(nextPage),
        },
      });
      return {
        status: 'ongoing',
      };
    }

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
