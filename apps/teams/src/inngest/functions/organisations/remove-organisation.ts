import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { createElbaClient } from '@/connectors/elba/client';
import { deleteSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';
import { inngest } from '../../client';

export const removeOrganisation = inngest.createFunction(
  {
    id: 'teams-remove-organisation',
    retries: env.REMOVE_ORGANISATION_MAX_RETRY,
  },
  {
    event: 'teams/app.uninstalled',
  },
  async ({ event }) => {
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
      await Promise.all(
        subscriptions.map((subscription) =>
          deleteSubscription(organisation.token, subscription.subscriptionId)
        )
      );
    }

    const elba = createElbaClient(organisationId, organisation.region);

    await elba.connectionStatus.update({ hasError: true });

    await db.delete(organisationsTable).where(eq(organisationsTable.id, organisationId));
  }
);
