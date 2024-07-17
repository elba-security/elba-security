import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable, sharePointTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { getDeltaItems } from '@/connectors/microsoft/delta/delta';
import { createSubscription } from '../subscriptions/create-subscription';

export const initializeDelta = inngest.createFunction(
  {
    id: 'sharepoint-initialize-data-protection-delta',
    concurrency: {
      key: 'event.data.siteId',
      limit: 1,
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
  { event: 'sharepoint/data_protection.initialize_delta.requested' },
  async ({ event, step }) => {
    const { organisationId, siteId, driveId, isFirstSync } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with itemId=${organisationId}`);
    }

    const newDeltaToken = await step.run('paginate', async () => {
      const result = await getDeltaItems({
        token: await decrypt(organisation.token),
        siteId,
        driveId,
        deltaToken: null,
      });

      if (!('newDeltaToken' in result)) {
        throw new Error('Failed to retrieve new delta token');
      }

      return result.newDeltaToken;
    });

    const data = await step.invoke('sharepoint/subscriptions.create.triggered', {
      function: createSubscription,
      data: {
        organisationId,
        siteId,
        driveId,
        isFirstSync,
      },
    });

    await db
      .insert(sharePointTable)
      .values({
        organisationId,
        siteId,
        driveId,
        subscriptionId: data.id,
        subscriptionExpirationDate: data.expirationDateTime,
        subscriptionClientState: data.clientState,
        delta: newDeltaToken,
      })
      .onConflictDoUpdate({
        target: [sharePointTable.organisationId, sharePointTable.driveId],
        set: {
          subscriptionId: data.id,
          subscriptionExpirationDate: data.expirationDateTime,
          subscriptionClientState: data.clientState,
          delta: newDeltaToken,
        },
      });

    return { status: 'completed' };
  }
);
