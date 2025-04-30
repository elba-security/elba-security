import { type UpdateUsers, type BaseWebhookData } from '@elba-security/schemas';
import {
  type Cursor,
  type ElbaInngestConfig,
  type MaybeNangoAuthType,
  type ElbaFn,
} from '../../types';
import { getNangoConnection } from '../../nango';

export type UsersSyncEvent = {
  'users.sync.requested': BaseWebhookData & { syncStartedAt: string } & Cursor<unknown>;
};

export type GetUsersFn<NangoAuthType extends MaybeNangoAuthType, CursorType> = ElbaFn<
  NangoAuthType,
  BaseWebhookData,
  UpdateUsers,
  CursorType
>;

export const createElbaUsersSyncFn = <NangoAuthType extends MaybeNangoAuthType, CursorType>(
  { name, sourceId, inngest, nangoClient, nangoAuthType }: ElbaInngestConfig,
  getUsersFn: GetUsersFn<NangoAuthType, CursorType>
) => {
  return inngest.createFunction(
    {
      id: `${name}-sync-users`,
      concurrency: {
        key: 'event.data.organisationId',
        limit: 1,
      },
      cancelOn: [
        {
          event: `${name}/organisation.installed`,
          match: 'data.organisationId',
        },
        {
          event: `${name}/organisation.uninstalled`,
          match: 'data.organisationId',
        },
      ],
      retries: 5,
    },
    { event: `${name}/users.sync.requested` },
    async ({ event, step }) => {
      const { organisationId, nangoConnectionId, region, syncStartedAt } = event.data;

      const connection = await getNangoConnection({
        nangoClient,
        nangoAuthType,
        nangoConnectionId,
      });

      const { users, cursor } = await step.run('list-users', async () =>
        // We need to explicitly cast cursor type to unknown as step.run is lost with generic types
        (getUsersFn as GetUsersFn<NangoAuthType, unknown>)({
          ...event.data,
          connection: connection as never,
        })
      );

      if (users.length) {
        await step.sendEvent('update-users', {
          name: `${region}/elba/users.updated`,
          data: {
            sourceId,
            organisationId,
            users,
          },
        });
      }

      if (cursor) {
        await step.sendEvent('synchronize-users', {
          name: `${name}/users.sync.requested`,
          data: { ...event.data, cursor },
        });
        return { status: 'ongoing' };
      }

      await step.sendEvent('delete-users-synced-before', {
        name: `${region}/elba/users.deleted`,
        data: {
          sourceId,
          organisationId,
          syncedBefore: syncStartedAt,
        },
      });

      return { status: 'completed' };
    }
  );
};
