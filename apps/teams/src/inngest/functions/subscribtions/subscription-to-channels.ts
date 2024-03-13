import { addDays } from 'date-fns';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';

export const subscribeToChannels = inngest.createFunction(
  {
    id: 'subscribe-to-channels',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'teams/teams.elba_app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.SUBSCRIBE_SYNC_MAX_RETRY,
  },
  { event: 'teams/channels.subscribe.triggered' },
  async ({ event }) => {
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
        resource: '/teams/getAllChannels',
        expirationDateTime: addDays(new Date(), 3).toISOString(),
      }),
    });
  }
);
