import { and, count, eq, not } from 'drizzle-orm';
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
  async ({ event, step }) => {
    const { organisationId } = event.data;
    const [organisation] = await db
      .select({
        region: organisationsTable.region,
        token: organisationsTable.token,
        tenantId: organisationsTable.tenantId,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const [countResponse] = await db
      .select({ countOfOrganisationsWithSameTenant: count() })
      .from(organisationsTable)
      .where(
        and(
          eq(organisationsTable.tenantId, organisation.tenantId),
          not(eq(organisationsTable.id, organisationId))
        )
      );

    // We should only delete subscriptions if it is the last organisation in the same tenant.
    if (countResponse && countResponse.countOfOrganisationsWithSameTenant === 0) {
      const subscriptions = await db
        .select({
          subscriptionId: subscriptionsTable.id,
        })
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.tenantId, organisation.tenantId));

      if (subscriptions.length) {
        await step.run(
          'delete-subscriptions-in-tenant',
          async () =>
            await Promise.all(
              subscriptions.map((subscription) =>
                deleteSubscription(organisation.token, subscription.subscriptionId)
              )
            )
        );

        await db
          .delete(subscriptionsTable)
          .where(eq(subscriptionsTable.tenantId, organisation.tenantId));
      }
    }

    const elba = createElbaClient(organisationId, organisation.region);

    await elba.connectionStatus.update({ hasError: true });

    await db.delete(organisationsTable).where(eq(organisationsTable.id, organisationId));
  }
);
