import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { Organisation } from '@/database/schema';
import { deleteUser } from '@/connectors/users';
import { inngest } from '../../client';
import { decrypt } from '@/common/crypto';

export const deleteHarvestUser = inngest.createFunction(
  {
    id: 'harvest-delete-user',
    priority: {
      run: '600',
    },
    retries: env.REMOVE_ORGANISATION_MAX_RETRY,
  },
  {
    event: 'harvest/users.delete.requested',
  },
  async ({ event, step }) => {
    const { id, organisationId } = event.data;

    // retrieve the Harvest organisation
    const organisation = await step.run('get-organisation', async () => {
      const [row] = await db
        .select({
          accessToken: Organisation.accessToken,
          harvestId: Organisation.harvestId,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!row) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return row;
    });

    await step.run('delete-user', async () => {
      const decryptedToken = await decrypt(organisation.accessToken);
      await deleteUser(decryptedToken, organisation.harvestId, id);
    });
  }
);
