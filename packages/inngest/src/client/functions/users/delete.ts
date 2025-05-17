import { type UsersDeleteUsersRequestedWebhookData } from '@elba-security/schemas';
import { getNangoConnection } from '../../nango';
import { type ElbaInngestConfig, type MaybeNangoAuthType, type ElbaFn } from '../../types';

export type UsersDeleteEvent = {
  'users.delete.requested': UsersDeleteUsersRequestedWebhookData;
};

export type DeleteUsersFn<
  SupportsBatch extends boolean,
  NangoAuthType extends MaybeNangoAuthType,
> = ElbaFn<
  NangoAuthType,
  SupportsBatch extends true
    ? UsersDeleteUsersRequestedWebhookData
    : Omit<UsersDeleteUsersRequestedWebhookData, 'ids'> & { id: string },
  void
>;

export type DeleteUsersConfig<NangoAuthType extends MaybeNangoAuthType> =
  | {
      isBatchDeleteSupported: true;
      batchSize?: number;
      deleteUsersFn: DeleteUsersFn<true, NangoAuthType>;
    }
  | {
      isBatchDeleteSupported: false;
      deleteUsersFn: DeleteUsersFn<false, NangoAuthType>;
    };

export const createElbaUsersDeleteFn = <NangoAuthType extends MaybeNangoAuthType>(
  { name, inngest, nangoClient, nangoAuthType }: ElbaInngestConfig,
  deleteUsersConfig: DeleteUsersConfig<NangoAuthType>
) => {
  return inngest.createFunction(
    {
      id: `${name}-delete-users`,
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
    { event: `${name}/users.delete.requested` },
    async ({ event, step }) => {
      const { organisationId, nangoConnectionId, region, ids } = event.data;

      const connection = await getNangoConnection({
        nangoClient,
        nangoAuthType,
        nangoConnectionId,
      });

      if (deleteUsersConfig.isBatchDeleteSupported) {
        const chunkSize = deleteUsersConfig.batchSize || ids.length;
        const chunks = Array.from({ length: Math.ceil(ids.length / chunkSize) }, (_, i) =>
          ids.slice(i * chunkSize, (i + 1) * chunkSize)
        );

        for (const [i, chunk] of chunks.entries()) {
          await step.run(`delete-users-chunk-${i + 1}`, () =>
            deleteUsersConfig.deleteUsersFn({
              nangoConnectionId,
              organisationId,
              region,
              connection: connection as never,
              ids: chunk,
            })
          );
        }
      } else {
        await Promise.all(
          ids.map((id) =>
            step.run(`delete-user-${id}`, () =>
              deleteUsersConfig.deleteUsersFn({
                nangoConnectionId,
                organisationId,
                region,
                connection: connection as never,
                id,
              })
            )
          )
        );
      }
    }
  );
};
