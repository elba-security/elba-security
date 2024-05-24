import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import type { MicrosoftSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';
import {
  createSubscription,
  deleteSubscription,
} from '@/connectors/microsoft/subscriptions/subscriptions';

export const recreateSubscriptionsForOrganisation = inngest.createFunction(
  {
    id: 'teams/recreate-subscriptions-for-organisation',
  },
  { event: 'teams/subscriptions.recreate.requested' },
  async ({ event, step }) => {
    const { organisationId } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const subscriptions = await step.run('get-subscriptions', async () =>
      db
        .select({
          subscriptionId: subscriptionsTable.id,
          resource: subscriptionsTable.resource,
          changeType: subscriptionsTable.changeType,
        })
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.organisationId, organisationId))
    );

    if (!subscriptions.length) {
      throw new NonRetriableError('There are no subscriptions in the database for organisation');
    }

    await step.run('delete-subscriptions', () =>
      Promise.all(
        subscriptions.map((subscription) =>
          deleteSubscription(organisation.token, subscription.subscriptionId)
        )
      )
    );

    await step.run('remove-subscriptions-in-db', async () => {
      await db
        .delete(subscriptionsTable)
        .where(eq(subscriptionsTable.organisationId, organisationId));
    });

    const subscriptionsToSave = await step.run('create-subscriptions', async () => {
      const results = await Promise.allSettled(
        subscriptions.map((subscription) =>
          createSubscription({
            encryptToken: organisation.token,
            resource: subscription.resource,
            changeType: subscription.changeType,
          })
        )
      );

      return results
        .filter(
          (result): result is PromiseFulfilledResult<MicrosoftSubscription | null> =>
            result.status === 'fulfilled'
        )
        .map((result) => result.value)
        .filter((subscription): subscription is MicrosoftSubscription => subscription !== null);
    });

    if (!subscriptionsToSave.length) {
      return {
        message: 'There are no subscriptions to save to the database.',
      };
    }

    await step.run('save-subscriptions', async () => {
      await db.insert(subscriptionsTable).values(
        subscriptionsToSave.map((subscription) => ({
          organisationId,
          id: subscription.id,
          resource: subscription.resource,
          changeType: subscription.changeType,
        }))
      );
    });

    return {
      message: 'Subscriptions successfully recreated',
    };
  }
);
