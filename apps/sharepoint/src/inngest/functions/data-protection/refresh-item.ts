import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { getAllItemPermissions } from '@/connectors/microsoft/sharepoint/permissions';
import { getItem } from '@/connectors/microsoft/sharepoint/item';
import { createElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';
import { formatDataProtectionItems } from './common/helpers';

export const refreshItem = inngest.createFunction(
  {
    id: 'sharepoint-refresh-data-protection-objects',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.MICROSOFT_DATA_PROTECTION_REFRESH_DELETE_CONCURRENCY,
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
  { event: 'sharepoint/data_protection.refresh_object.requested' },
  async ({ event, step }) => {
    const {
      id: itemId,
      organisationId,
      metadata: { siteId, driveId },
    } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with itemId=${organisationId}`);
    }

    await step.run('get-item-permissions', async () => {
      const token = await decrypt(organisation.token);

      const elba = createElbaClient({ organisationId, region: organisation.region });

      const [item, { permissions }] = await Promise.all([
        getItem({ token, siteId, driveId, itemId }),
        getAllItemPermissions({
          token,
          siteId,
          driveId,
          itemId,
        }),
      ]);

      if (item !== null && permissions.length) {
        const dataProtectionItem = formatDataProtectionItems({
          itemsWithPermisions: [
            {
              item,
              permissions,
            },
          ],
          siteId,
          driveId,
        });

        if (dataProtectionItem.length) {
          await elba.dataProtection.updateObjects({
            objects: dataProtectionItem,
          });
          return;
        }
      }

      await elba.dataProtection.deleteObjects({
        ids: [itemId],
      });
    });
  }
);
