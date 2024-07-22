import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { createSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';

export const createSubscriptionToChannels = inngest.createFunction(
  {
    id: 'teams-create-subscription-to-channels',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'teams/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.SUBSCRIBE_SYNC_MAX_RETRY,
  },
  { event: 'teams/channels.subscription.requested' },
  async ({ event }) => {
    const { organisationId } = event.data;

    const changeType = 'created,deleted';
    const resource = 'teams/getAllChannels';

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const [subscriptionInDb] = await db
      .select({
        id: subscriptionsTable.id,
      })
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.organisationId, organisationId),
          eq(subscriptionsTable.resource, resource)
        )
      );

    if (subscriptionInDb) {
      return null;
    }

    const subscription = await createSubscription({
      encryptToken: organisation.token,
      changeType,
      resource,
    });

    if (!subscription) {
      throw new NonRetriableError('Could not retrieve subscription');
    }

    await db.insert(subscriptionsTable).values({ ...subscription, organisationId });
  }
);
