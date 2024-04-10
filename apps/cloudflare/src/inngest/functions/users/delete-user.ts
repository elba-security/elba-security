import { Elba } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { env } from '@/env';
import { Organisation } from '@/database/schema';
import { deleteUser } from '@/connectors/users';
import { db } from '@/database/client';
import { inngest } from '../../client';

export const deleteCloudflareUser = inngest.createFunction(
  {
    id: 'delete-user',
    priority: {
      run: '600',
    },
    retries: 1,
  },
  {
    event: 'cloudflare/users.delete.requested',
  },
  async ({ event, step }) => {
    const { id, organisationId } = event.data;

    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          authEmail: Organisation.authEmail,
          authKey: Organisation.authKey,
          region: Organisation.region,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return result;
    });

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region: organisation.region,
    });

    await step.run('delete-user', async () => {
      await deleteUser(organisation.authEmail, organisation.authKey, id);
      await elba.users.delete({ ids: [id] });
    });
  }
);
