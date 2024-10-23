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
    concurrency: { key: 'event.data.tenantId', limit: 1 },
    retries: env.SUBSCRIBE_SYNC_MAX_RETRY,
  },
  { event: 'teams/channel.subscription.requested' },
  async ({ event, step }) => {
    const { teamId, channelId, organisationId, tenantId } = event.data;

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

    const [subscriptionInDb] = await step.run(
      'get-subscription-for-resource-from-database',
      async () =>
        db
          .select({
            id: subscriptionsTable.id,
          })
          .from(subscriptionsTable)
          .where(
            and(
              eq(subscriptionsTable.tenantId, tenantId),
              eq(subscriptionsTable.resource, resource)
            )
          )
    );

    if (subscriptionInDb) {
      return `Subscription for resource - ${resource} in tenant - ${tenantId} already exists`;
    }

    const subscription = await step.run('creat-subscription-in-microsoft-organisation', async () =>
      createSubscription({
        encryptToken: organisation.token,
        changeType,
        resource,
      })
    );

    if (!subscription) {
      throw new NonRetriableError('Could not create subscription');
    }

    await db
      .insert(subscriptionsTable)
      .values({ ...subscription, tenantId })
      .onConflictDoNothing();

    return `Subscription successfully created for resource - ${resource} in tenant - ${tenantId}`;
  }
);
