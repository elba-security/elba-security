import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable, sharePointTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { getDelta } from '@/connectors/microsoft/delta/get-delta';
import { env } from '@/common/env';
import { subscriptionToDrive } from '../subscriptions/subscription-to-drives';

export const initializeDelta = inngest.createFunction(
  {
    id: 'share-point-initialize-data-protection-delta',
    concurrency: {
      key: 'event.data.siteId',
      limit: env.MICROSOFT_DATA_PROTECTION_ITEMS_SYNC_CONCURRENCY,
    },
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    cancelOn: [
      {
        event: 'share-point/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'share-point/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'share-point/data_protection.initialize_delta.requested' },
  async ({ event, step }) => {
    const { organisationId, siteId, driveId, isFirstSync, skipToken } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with itemId=${organisationId}`);
    }

    const { nextSkipToken, newDeltaToken } = await step.run('paginate', async () => {
      const result = await getDelta({
        token: await decrypt(organisation.token),
        siteId,
        driveId,
        isFirstSync,
        skipToken,
        deltaToken: null,
      });

      return result;
    });

    if (nextSkipToken) {
      await step.sendEvent('sync-next-delta-page', {
        name: 'share-point/data_protection.initialize_delta.requested',
        data: {
          organisationId,
          siteId,
          driveId,
          isFirstSync,
          skipToken: nextSkipToken,
        },
      });

      return {
        status: 'ongoing',
      };
    }

    if (!newDeltaToken) throw new NonRetriableError('Delta token not found!');

    const data = await step.invoke('share-point/drives.subscription.triggered', {
      function: subscriptionToDrive,
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

    return {
      status: 'completed',
    };
  }
);
