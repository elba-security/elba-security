import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { organisationsTable } from '@/database/schema';
import { createElbaClient } from '@/connectors/elba/client';
import { inngest } from '../../client';

export const removeOrganisation = inngest.createFunction(
  {
    id: 'teams-remove-organisation',
    retries: env.REMOVE_ORGANISATION_MAX_RETRY,
  },
  {
    event: 'teams/app.uninstalled',
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
        event: 'teams/subscriptions.remove.completed',
        timeout: '30d',
        if: `async.data.organisationId == '${organisationId}'`,
      }),
      step.sendEvent('subscription-remove-triggered', {
        name: 'teams/subscriptions.remove.triggered',
        data: { organisationId },
      }),
    ]);

    const elba = createElbaClient(organisationId, organisation.region);

    await elba.connectionStatus.update({ errorType: 'unauthorized' });

    await db.delete(organisationsTable).where(eq(organisationsTable.id, organisationId));
  }
);
