import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { Organisation } from '@/database/schema';
import { deleteUser } from '@/connectors/users';
import { inngest } from '../../client';

export const deleteSentryUser = inngest.createFunction(
  {
    id: 'sentry-delete-user',
    retries: env.REMOVE_ORGANISATION_MAX_RETRY,
  },
  {
    event: 'sentry/users.delete.requested',
  },
  async ({ event, step }) => {
    const { id, organisationId } = event.data;

    const organisation = await step.run('get-organisation', async () => {
      const [row] = await db
        .select({
          token: Organisation.token,
          organizationSlug: Organisation.organizationSlug,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!row) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return row;
    });

    await step.run('delete-user', async () => {
      await deleteUser(organisation.token, organisation.organizationSlug, id);
    });
  }
);
