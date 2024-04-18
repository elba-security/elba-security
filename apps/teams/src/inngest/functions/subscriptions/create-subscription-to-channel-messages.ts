import { NonRetriableError } from 'inngest';
import { and, eq } from 'drizzle-orm';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { createSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';

export const createSubscriptionToChannelMessages = inngest.createFunction(
  {
    id: 'teams-create-subscription-to-channel-messages',
    concurrency: { key: 'event.data.uniqueChannelInOrganisationId', limit: 1 },
    cancelOn: [
      {
        event: 'teams/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.SUBSCRIBE_SYNC_MAX_RETRY,
  },
  { event: 'teams/channel.subscription.requested' },
  async ({ event }) => {
    const { teamId, channelId, organisationId } = event.data;

    const changeType = 'created,updated,deleted';
    const resource = `teams/${teamId}/channels/${channelId}/messages`;

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
