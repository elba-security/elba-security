import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { type ElbaContext } from '../../../types';

export const deleteUser = ({ inngest, config, db, schema }: ElbaContext) =>
  inngest.createFunction(
    {
      id: 'delete-users',
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
      retries: 5,
    },
    { event: `${config.name}/users.delete.requested` },
    async ({ event, step }) => {
      const { userId, organisationId } = event.data;
      const [organisation] = await db
        .select()
        .from(schema.organisations)
        .where(eq(schema.organisations.id, organisationId));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- it's safe
      await step.run('delete-user', () => config.users.deleteUser!(organisation, userId));
    }
  );
