import { addDays } from 'date-fns';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';

export const subscribeToChannelMessage = inngest.createFunction(
  {
    id: 'subscribe-to-channel',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    cancelOn: [
      {
        event: 'teams/teams.elba_app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.SUBSCRIBE_SYNC_MAX_RETRY,
  },
  { event: 'teams/channel.subscribe.triggered' },
  async ({ event }) => {
    const { teamId, channelId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const token = await decrypt(organisation.token);

    await fetch(`${env.MICROSOFT_API_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        changeType: 'created,deleted',
        notificationUrl: `${env.WEBHOOK_URL}/api/webhook`,
        lifecycleNotificationUrl: `${env.WEBHOOK_URL}/api/lifecycleNotifications`,
        resource: `teams/${teamId}/channels/${channelId}/messages`,
        expirationDateTime: addDays(new Date(), 3).toISOString(),
      }),
    });
  }
);
