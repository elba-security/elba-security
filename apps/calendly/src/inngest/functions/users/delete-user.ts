import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { Organisation } from '@/database/schema';
import { deleteUser } from '@/connectors/users';
import { inngest } from '../../client';

export const deleteCalendlyUser = inngest.createFunction(
  {
    id: 'calendly-delete-user',
    priority: {
      run: '600',
    },
    retries: env.REMOVE_ORGANISATION_MAX_RETRY,
  },
  {
    event: 'calendly/users.delete.requested',
  },
  async ({ event, step }) => {
    const { id, organisationId } = event.data;

    // retrieve the Calendly organisation access token
    const accessToken = await step.run('get-access-token', async () => {
      const [organisation] = await db
        .select({
          accessToken: Organisation.accessToken,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return organisation.accessToken;
    });

    if (accessToken) {
      await step.run('delete-user', async () => {
        await deleteUser(accessToken, id);
      });
    }

    return {
      status: 'completed',
    };
  }
);
