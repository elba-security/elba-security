import { eq } from 'drizzle-orm';
import type { TeamsEventHandler } from '@/inngest/functions/teams/event-handlers/index';
import { db } from '@/database/client';
import { channelsTable, subscriptionsTable } from '@/database/schema';
import { deleteSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';

export const channelDeletedHandler: TeamsEventHandler = async (
  { channelId, subscriptionId, organisations, token },
  { step }
) => {
  await step.run('delete-subscription-in-microsoft-organisation', async () =>
    deleteSubscription(await decrypt(token), subscriptionId)
  );

  await step.run('delete-subscription-and-channel-from-database', async () => {
    await Promise.all([
      db.delete(subscriptionsTable).where(eq(subscriptionsTable.id, subscriptionId)),
      db.delete(channelsTable).where(eq(channelsTable.id, channelId)),
    ]);
  });

  await inngest.send(
    organisations.map((organisation) => {
      return {
        name: 'teams/teams.sync.requested',
        data: {
          organisationId: organisation.id,
          syncStartedAt: new Date().toISOString(),
          skipToken: null,
          isFirstSync: true,
        },
      };
    })
  );

  return 'The channel has been removed from the database';
};
