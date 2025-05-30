import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers, getAuthUser } from '@/connectors/pagerduty/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { type PagerdutyUser } from '@/connectors/pagerduty/users';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUser = ({ user, subDomain }: { user: PagerdutyUser; subDomain: string }): User => ({
  id: user.id,
  displayName: user.name,
  email: user.email,
  role: user.role,
  additionalEmails: [],
  url: `https://${subDomain}.pagerduty.com/users/${user.id}`,
  isSuspendable: user.role !== 'owner',
});

export const syncUsers = inngest.createFunction(
  {
    id: 'pagerduty-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'pagerduty/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'pagerduty/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'pagerduty/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

      const result = await getUsers({
        accessToken: credentials.access_token,
        page,
      });
      const { authUserUrl } = await getAuthUser(credentials.access_token);

      const match = /https?:\/\/(?<subDomain>.*?)\.pagerduty\.com/.exec(authUserUrl);

      if (!match?.groups?.subDomain) {
        throw new NonRetriableError('Could not retrieve auth user url');
      }
      const subDomain = match.groups.subDomain;

      const users = result.validUsers
        .filter(({ invitation_sent: isPending }) => !isPending)
        .map((user) => formatElbaUser({ user, subDomain }));

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
      await step.sendEvent('sync-users', {
        name: 'pagerduty/users.sync.requested',
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
