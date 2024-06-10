import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';
import { deleteItemPermission } from '@/connectors/microsoft/sharepoint/permissions';
import { MicrosoftError } from '@/common/error';
import { createElbaClient } from '@/connectors/elba/client';

export const deleteDataProtectionItemPermissions = inngest.createFunction(
  {
    id: 'sharepoint-delete-data-protection-object-permissions',
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
  { event: 'sharepoint/data_protection.delete_object_permissions.requested' },
  async ({ event, step }) => {
    const {
      id: itemId,
      organisationId,
      metadata: { siteId, driveId },
      permissions,
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

    const permissionDeletionResults = await Promise.allSettled(
      permissions.map((permissionId) =>
        step.run('delete-item-permissions', async () => {
          try {
            await deleteItemPermission({
              token,
              siteId,
              driveId,
              itemId,
              permissionId,
            });

            return { status: 204, permissionId };
          } catch (error) {
            if (error instanceof MicrosoftError && error.response?.status === 404)
              return { status: 404, permissionId };

            throw error;
          }
        })
      )
    );

    const parsedResult = permissionDeletionResults.reduce<{
      deletedPermissions: string[];
      notFoundPermissions: string[];
      unexpectedFailedPermissions: string[];
    }>(
      (acc, el, index) => {
        if (el.status === 'fulfilled') {
          if (el.value.status === 204) acc.deletedPermissions.push(el.value.permissionId);
          if (el.value.status === 404) acc.notFoundPermissions.push(el.value.permissionId);
        }
        if (el.status === 'rejected') {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- can't be undefined
          acc.unexpectedFailedPermissions.push(permissions[index]!);
        }

        return acc;
      },
      { deletedPermissions: [], notFoundPermissions: [], unexpectedFailedPermissions: [] }
    );

    if (parsedResult.notFoundPermissions.length) {
      const elba = createElbaClient({ organisationId, region: organisation.region });
      await elba.dataProtection.deleteObjects({
        ids: [itemId],
      });
    }

    return parsedResult;
  }
);
