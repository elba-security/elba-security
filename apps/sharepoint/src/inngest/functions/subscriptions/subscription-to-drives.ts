import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { v4 as uuidv4 } from 'uuid';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { createSubscription } from '@/connectors/microsoft/subscription/subscriptions';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const subscriptionToDrive = inngest.createFunction(
  {
    id: 'sharepoint-subscribe-to-drive',
    concurrency: {
      key: 'event.data.siteId',
      limit: env.MICROSOFT_CREATE_SUBSCRIPTION_CONCURRENCY,
    },
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    cancelOn: [
      {
        event: 'sharepoint/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'sharepoint/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'sharepoint/drives.subscription.triggered' },
  async ({ event }) => {
    const { organisationId, siteId, driveId } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const changeType = 'updated';
    const resource = `sites/${siteId}/drives/${driveId}/root`;
    const clientState = uuidv4();

    return createSubscription({
      token: await decrypt(organisation.token),
      changeType,
      resource,
      clientState,
    });
  }
);
