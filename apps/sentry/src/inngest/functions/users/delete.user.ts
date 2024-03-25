import { Elba } from '@elba-security/sdk';
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
    priority: { 
      run: '600',
    },
    retries: env.REMOVE_ORGANISATION_MAX_RETRY,
  },
  {
    event: 'sentry/users.delete.requested',
  },
  async ({ event, step }) => {
    const { id, organisationId } = event.data;

    // retrieve the Sentry organisation token
    const organisation = await step.run('get-organisation', async () => {
      const [row] = await db
        .select({
          token: Organisation.token,
          region: Organisation.region,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!row) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return row;
    });
    
     const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region: organisation.region,
    });

    await step.run('delete-user', async () => {
      await deleteUser(organisation.token, id);
      await elba.users.delete({ ids: [id] });
    });
  }
);
