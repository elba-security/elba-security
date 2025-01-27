import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers , getAuthUser } from '@/connectors/zoom/users';
import { type ZoomUser } from '@/connectors/zoom/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';

enum ZoomUserRole {
  Owner = '0',
  Admin = '1',
}

const formatElbaUser = ({ authUserId, user }: { authUserId: string; user: ZoomUser }): User => ({
  id: user.id,
  displayName: user.display_name,
  email: user.email,
  additionalEmails: [],
  isSuspendable:
    authUserId !== user.id &&
    (user.role_id as ZoomUserRole) !== ZoomUserRole.Owner &&
    (user.role_id as ZoomUserRole) !== ZoomUserRole.Admin,
  url: `https://zoom.us/user/${user.id}/profile`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'zoom-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'zoom/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'zoom/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'zoom/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError('Could not retrieve Nango credentials');
      }

      const result = await getUsers({ accessToken: credentials.access_token, page });
      const { authUserId } = await getAuthUser(credentials.access_token);

      const users = result.validUsers.map((user) => {
        return formatElbaUser({
          authUserId,
          user,
        });
      });

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
        name: 'zoom/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage.toString(),
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
