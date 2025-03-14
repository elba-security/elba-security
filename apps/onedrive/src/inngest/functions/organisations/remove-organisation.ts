import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { createElbaClient } from '@/connectors/elba/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

export const removeOrganisation = inngest.createFunction(
  {
    id: 'onedrive-remove-organisation',
    retries: 5,
  },
  {
    event: 'onedrive/app.uninstalled',
  },
  async ({ event, step }) => {
    const { organisationId } = event.data;
    const [organisation] = await db
      .select({ region: organisationsTable.region })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    await Promise.all([
      step.waitForEvent(`wait-for-remove-organisation-subscriptions-complete`, {
        event: 'onedrive/subscriptions.remove.completed',
        timeout: '30d',
        if: `async.data.organisationId == '${organisationId}'`,
      }),
      step.sendEvent('subscription-remove-triggered', {
        name: 'onedrive/subscriptions.remove.triggered',
        data: { organisationId },
      }),
    ]);

    const elba = createElbaClient({ organisationId, region: organisation.region });

    await elba.connectionStatus.update({ errorType: 'unauthorized' });

    await db.delete(organisationsTable).where(eq(organisationsTable.id, organisationId));
  }
);
