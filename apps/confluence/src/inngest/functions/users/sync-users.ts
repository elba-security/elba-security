import { inngest } from '@/inngest/client';
import { getGroupIds } from '@/connectors/confluence/groups';
import { decrypt } from '@/common/crypto';
import { deleteUsers } from '@/inngest/common/users';
import { createElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';
import { getOrganisation } from '../../common/organisations';
import { syncGroupUsers } from './sync-group-users';

export const syncUsers = inngest.createFunction(
  {
    id: 'confluence-sync-users',
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
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: env.USERS_SYNC_MAX_RETRY,
  },
  {
    event: 'confluence/users.sync.requested',
  },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, isFirstSync, cursor } = event.data;

    const organisation = await step.run('get-organisation', () => getOrganisation(organisationId));
    const { groupIds, cursor: nextCursor } = await step.run('list-group-ids', async () =>
      getGroupIds({
        accessToken: await decrypt(organisation.accessToken),
        instanceId: organisation.instanceId,
        cursor,
        limit: env.USERS_SYNC_GROUPS_BATCH_SIZE,
      })
    );
    // sync retrieved groups users
    await Promise.all(
      groupIds.map((groupId) =>
        step.invoke(`sync-group-users-${groupId}`, {
          function: syncGroupUsers,
          data: {
            isFirstSync: event.data.isFirstSync,
            cursor: null,
            organisationId,
            syncStartedAt,
            groupId,
          },
          timeout: '0.5d',
        })
      )
    );

    if (nextCursor) {
      await step.sendEvent('request-next-groups-sync', {
        name: 'confluence/users.sync.requested',
        data: {
          organisationId,
          isFirstSync,
          syncStartedAt,
          cursor: nextCursor,
        },
      });
      return {
        status: 'ongoing',
      };
    }

    await step.run('finalize', async () => {
      const elba = createElbaClient(organisation.id, organisation.region);
      await elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() });
      await deleteUsers({ organisationId, syncStartedAt });
    });

    return {
      status: 'completed',
    };
  }
);
