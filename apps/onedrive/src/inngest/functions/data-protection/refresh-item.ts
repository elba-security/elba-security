import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { getAllItemPermissions } from '@/connectors/microsoft/onedrive/permissions';
import { getItem } from '@/connectors/microsoft/onedrive/items';
import { createElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';
import { formatDataProtectionObjects } from '@/connectors/elba/data-protection';

export const refreshDataProtectionObject = inngest.createFunction(
  {
    id: 'onedrive-refresh-data-protection-object',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.MICROSOFT_DATA_PROTECTION_REFRESH_DELETE_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'onedrive/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'onedrive/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'onedrive/data_protection.refresh_object.requested' },
  async ({ event, step }) => {
    const {
      id: itemId,
      organisationId,
      metadata: { userId },
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

    const token = await decrypt(organisation.token);

    const elba = createElbaClient({ organisationId, region: organisation.region });

    const result = await step.run('get-item-permissions', async () => {
      const item = await getItem({ token, userId, itemId });
      if (!item) {
        return null;
      }

      const permissions = await getAllItemPermissions({ token, userId, itemId });
      return { item, permissions };
    });

    if (!result) {
      await elba.dataProtection.deleteObjects({ ids: [itemId] });
      return { status: 'deleted' };
    }

    const { item, permissions } = result;
    const parentId = item.parentReference.id;
    let parentPermissionIds: string[] = [];
    if (parentId) {
      parentPermissionIds = await step.run('get-parent-permissions', async () => {
        const parentPermissions = await getAllItemPermissions({
          token,
          userId,
          itemId: parentId,
        });

        return parentPermissions.map((permission) => permission.id);
      });
    }

    const {
      toUpdate: [dataProtectionObject],
    } = formatDataProtectionObjects({
      userId,
      items: [{ item, permissions }],
      parentPermissionIds,
    });

    if (!dataProtectionObject) {
      await elba.dataProtection.deleteObjects({ ids: [itemId] });
      return { status: 'deleted' };
    }

    await elba.dataProtection.updateObjects({ objects: [dataProtectionObject] });
    return { status: 'updated' };
  }
);
