import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { env } from '@/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as subscriptionConnector from '@/connectors/microsoft/subscriptions/subscriptions';

export const refreshSubscription = inngest.createFunction(
  {
    id: 'teams-refresh-subscription',
    cancelOn: [
      {
        event: 'teams/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.SUBSCRIBE_SYNC_MAX_RETRY,
  },
  { event: 'teams/subscription.refresh.requested' },
  async ({ event }) => {
    const { subscriptionId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(
        `Could not retrieve organisation with organisationId=${organisationId}`
      );
    }

    await subscriptionConnector.refreshSubscription(organisation.token, subscriptionId);
  }
);
