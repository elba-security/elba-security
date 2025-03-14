import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
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
      .select({
        region: organisationsTable.region,
        token: organisationsTable.token,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const subscriptions = await db
      .select({
        subscriptionId: subscriptionsTable.id,
      })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.organisationId, organisationId));

    if (subscriptions.length) {
      await Promise.all([
        ...subscriptions.map(({ subscriptionId }) =>
          step.waitForEvent(`wait-for-remove-subscription-complete-${subscriptionId}`, {
            event: 'teams/subscriptions.remove.completed',
            timeout: '30d',
            if: `async.data.organisationId == '${organisationId}' && async.data.subscriptionId == '${subscriptionId}'`,
          })
        ),
        step.sendEvent(
          'subscription-remove-triggered',
          subscriptions.map(({ subscriptionId }) => ({
            name: 'teams/subscriptions.remove.triggered',
            data: {
              organisationId,
              subscriptionId,
            },
          }))
        ),
      ]);
    }

    const elba = createElbaClient(organisationId, organisation.region);

    await elba.connectionStatus.update({ errorType: 'unauthorized' });

    await db.delete(organisationsTable).where(eq(organisationsTable.id, organisationId));
  }
);
