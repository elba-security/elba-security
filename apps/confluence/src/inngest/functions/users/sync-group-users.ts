import { inngest } from '@/inngest/client';
import { getGroupMembers } from '@/connectors/confluence/groups';
import { formatElbaUser } from '@/connectors/elba/users/users';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';
import { getOrganisation } from '../../common/organisations';
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
    const { organisationId, cursor, syncStartedAt, groupId, isFirstSync } = event.data;

    const organisation = await step.run('get-organisation', () => getOrganisation(organisationId));

    const nextCursor = await step.run('paginate-group-users', async () => {
      const elba = createElbaClient(organisation.id, organisation.region);
      const result = await getGroupMembers({
        accessToken: await decrypt(organisation.accessToken),
        instanceId: organisation.instanceId,
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
        organisationId,
        syncStartedAt,
        isFirstSync,
        groupId,
        cursor: nextCursor,
      },
    });
  }
);
