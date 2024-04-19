import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import type { MakeInngestFunctionParams } from '../types';
import { decryptOrganisation } from '../../../utils/encryption';

export const createSyncUsers = <T extends string>({
  inngest,
  config,
}: MakeInngestFunctionParams<T>) =>
  inngest.createFunction(
    {
      id: `${inngest.id}-sync-users`,
      concurrency: {
        key: 'event.data.organisationId',
        limit: 1,
      },
    },
    { event: `${config.id}/users.sync.requested` },
    async ({ event, step }) => {
      const { db, organisationsTable, encryption } = config.database;

      const { organisationId, syncStartedAt, cursor } = event.data;

      const [organisation] = await db
        .select()
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisationId));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      const elba = new Elba({
        organisationId,
        apiKey: config.elba.apiKey,
        baseUrl: config.elba.sourceId,
        region: organisation.region,
      });

      const nextCursor = await step.run('paginate', async () => {
        const decryptedOrganisation = await decryptOrganisation(organisation, encryption);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- convenience
        const result = await config.features!.users!.getUsers!(decryptedOrganisation, cursor);

        await elba.users.update({
          users: result.users,
        });

        return result.nextCursor;
      });

      if (nextCursor) {
        await step.sendEvent('sync-next-users-page', {
          name: `${config.id}/users.sync.requested`,
          data: {
            ...event.data,
            cursor: nextCursor,
          },
        });

        return {
          status: 'ongoing',
        };
      }

      await elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() });

      return {
        status: 'completed',
      };
    }
  );
