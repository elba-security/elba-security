import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { addDays } from 'date-fns';
import { inngest } from '@/inngest/client';
import { env } from '@/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';

export const subscribeRefreshExpire = inngest.createFunction(
  {
    id: 'subscribe-refresh-expire',
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
  { event: 'teams/subscribe.refresh.triggered' },
  async ({ event }) => {
    const { subscriptionId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.tenantId, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const token = await decrypt(organisation.token);

    await fetch(`${env.MICROSOFT_API_URL}/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        expirationDateTime: addDays(new Date(), 3).toISOString(),
      }),
    });
  }
);
