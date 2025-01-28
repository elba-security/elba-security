import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';
import { getGroupMembers } from '@/connectors/confluence/groups';
import { formatElbaUser } from '@/connectors/elba/users/users';
import { env } from '@/common/env';
import { getInstance } from '@/connectors/confluence/auth';
import { updateUsers } from '../../common/users';

export const syncGroupUsers = inngest.createFunction(
  {
    id: 'confluence-sync-group-users',
    cancelOn: [
      {
        event: 'confluence/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'confluence/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.USERS_SYNC_GROUP_USERS_MAX_RETRY,
  },
  { event: 'confluence/users.group_users.sync.requested' },
  async ({ event, step }) => {
    const {
      organisationId,
      cursor,
      syncStartedAt,
      groupId,
      isFirstSync,
      nangoConnectionId,
      region,
    } = event.data;

    const nextCursor = await step.run('paginate-group-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError('Could not retrieve Nango credentials');
      }
      const instance = await getInstance(credentials.access_token);

      const elba = createElbaOrganisationClient({ organisationId, region });
      const result = await getGroupMembers({
        accessToken: credentials.access_token,
        instanceId: instance.id,
        groupId,
        cursor,
      });
      const atlassianMembers = result.members.filter((user) => user.accountType === 'atlassian');

      if (atlassianMembers.length > 0) {
        await updateUsers({
          users: atlassianMembers,
          organisationId,
          syncStartedAt,
        });
        await elba.users.update({
          users: atlassianMembers.map(formatElbaUser),
        });
      }

      return result.cursor;
    });

    if (!nextCursor) {
      return;
    }

    // this is fine as users pagination size is 200
    // recursive invoke cascading effect will be very limited
    await step.invoke('request-next-group-users-sync', {
      function: syncGroupUsers,
      data: {
        nangoConnectionId,
        region,
        organisationId,
        syncStartedAt,
        isFirstSync,
        groupId,
        cursor: nextCursor,
      },
    });
  }
);
