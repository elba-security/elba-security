import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { Elba } from '@elba-security/sdk';
import { type ElbaContext } from '../../../types';
import { env } from '../../../common/env';

export const syncUsers = ({ inngest, config, db, schema }: ElbaContext) =>
  inngest.createFunction(
    {
      id: 'sync-users',
      concurrency: {
        key: 'event.data.organisationId',
        limit: 1,
      },
      cancelOn: [
        {
          event: `${config.name}/app.uninstalled`,
          match: 'event.data.organisationId',
        },
        {
          event: `${config.name}/app.installed`,
          match: 'event.data.organisationId',
        },
      ],
    },
    { event: `${config.name}/users.sync.requested` },
    async ({ event, step }) => {
      const { cursor, organisationId, syncStartedAt } = event.data;
      const [organisation] = await db
        .select()
        .from(schema.organisations)
        .where(eq(schema.organisations.id, organisationId));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      const { users, nextCursor } = await step.run('sync-users-page', () =>
        config.users.getUsers(organisation, cursor)
      );

      const elba = new Elba({
        organisationId,
        apiKey: env.ELBA_API_KEY,
        baseUrl: env.ELBA_API_BASE_URL,
        region: organisation.region,
      });

      if (users.length > 0) {
        await step.run('update-users', () => elba.users.update({ users }));
      }

      if (nextCursor) {
        await step.sendEvent('sync-next-page', {
          name: `${config.name}/users.sync.requested`,
          data: {
            ...event.data,
            cursor: nextCursor,
          },
        });
        return { status: 'ongoing' };
      }

      await step.run('delete-users', () => elba.users.delete({ syncedBefore: syncStartedAt }));

      return { status: 'completed' };
    }
  );
