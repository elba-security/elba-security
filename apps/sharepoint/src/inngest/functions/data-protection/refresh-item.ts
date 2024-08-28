import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { getAllItemPermissions } from '@/connectors/microsoft/sharepoint/permissions';
import { getItem } from '@/connectors/microsoft/sharepoint/items';
import { createElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';
import { formatDataProtectionObjects } from '@/connectors/elba/data-protection';

export const refreshDataProtectionObject = inngest.createFunction(
  {
    id: 'sharepoint-refresh-data-protection-object',
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

    const token = await decrypt(organisation.token);

    const elba = createElbaClient({ organisationId, region: organisation.region });

    const result = await step.run('get-item-permissions', async () => {
      const item = await getItem({ token, siteId, driveId, itemId });
      if (!item) {
        return null;
      }

      const permissions = await getAllItemPermissions({ token, siteId, driveId, itemId });
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
          siteId,
          driveId,
          itemId: parentId,
        });

        return parentPermissions.map((permission) => permission.id);
      });
    }

    const {
      toUpdate: [dataProtectionObject],
    } = formatDataProtectionObjects({
      driveId,
      items: [{ item, permissions }],
      siteId,
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
