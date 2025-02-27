import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getGroupIds } from '@/connectors/confluence/groups';
import { deleteUsers } from '@/inngest/common/users';
import { env } from '@/common/env';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';
import { getInstance } from '@/connectors/confluence/auth';
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
    const { organisationId, syncStartedAt, isFirstSync, cursor, nangoConnectionId, region } =
      event.data;
    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new NonRetriableError('Could not retrieve Nango credentials');
    }
    const instance = await getInstance(credentials.access_token);
    const accessToken = credentials.access_token;

    const { groupIds, cursor: nextCursor } = await step.run('list-group-ids', async () =>
      getGroupIds({
        accessToken,
        instanceId: instance.id,
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
            nangoConnectionId,
            region,
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
          nangoConnectionId,
          region,
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
      const elba = createElbaOrganisationClient({ organisationId, region });
      await elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() });
      await deleteUsers({ organisationId, syncStartedAt });
    });

    return {
      status: 'completed',
    };
  }
);
