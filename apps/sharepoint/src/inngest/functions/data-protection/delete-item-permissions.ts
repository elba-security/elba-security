import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';
import type { PermissionDeletionResult } from './common/types';
import {
  createDeleteItemPermissionFunction,
  preparePermissionDeletionArray,
} from './common/helpers';

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

    const permissionDeletionArray = preparePermissionDeletionArray(permissions);

    const permissionDeletionResults = await Promise.allSettled(
      permissionDeletionArray.map(({ permissionId, userEmails }) =>
        step.run(
          'delete-item-permissions',
          createDeleteItemPermissionFunction({
            token,
            siteId,
            driveId,
            itemId,
            permissionId,
            userEmails,
          })
        )
      )
    );

    const parsedResult = permissionDeletionResults.reduce<{
      deletedPermissions: PermissionDeletionResult[];
      notFoundPermissions: PermissionDeletionResult[];
      unexpectedFailedPermissions: PermissionDeletionResult[];
    }>(
      (acc, el, index) => {
        if (el.status === 'fulfilled') {
          const permissionDeletionResult = {
            siteId,
            driveId,
            itemId,
            permissionId: el.value.permissionId,
            userEmails: el.value.userEmails,
          };

          if (el.value.status === 204)
            acc.deletedPermissions.push({ status: el.value.status, ...permissionDeletionResult });
          if (el.value.status === 404)
            acc.notFoundPermissions.push({ status: el.value.status, ...permissionDeletionResult });
        }
        if (el.status === 'rejected') {
          acc.unexpectedFailedPermissions.push({
            siteId,
            driveId,
            itemId,
            status: 500,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- will be there
            permissionId: permissionDeletionArray[index]!.permissionId,
            userEmails: permissionDeletionArray[index]?.userEmails,
          });
        }

        return acc;
      },
      { deletedPermissions: [], notFoundPermissions: [], unexpectedFailedPermissions: [] }
    );

    return parsedResult;
  }
);
