import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { createSubscription as createSharepointSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const createSubscription = inngest.createFunction(
  {
    id: 'sharepoint-create-subscription',
    concurrency: {
      key: 'event.data.siteId',
      limit: env.MICROSOFT_CREATE_SUBSCRIPTION_CONCURRENCY,
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
  { event: 'sharepoint/subscriptions.create.triggered' },
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
    const clientState = crypto.randomUUID();

    return createSharepointSubscription({
      token: await decrypt(organisation.token),
      changeType,
      resource,
      clientState,
    });
  }
);
