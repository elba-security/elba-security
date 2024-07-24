import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';
import {
  deleteItemPermission,
  revokeUsersFromLinkPermission,
} from '@/connectors/microsoft/sharepoint/permissions';
import { parsePermissionsToDelete } from './common/helpers';
import { type PermissionToDelete } from './common/types';

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
  async ({ event, step, logger }) => {
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

    const permissionsToDelete = parsePermissionsToDelete(permissions);

    const permissionDeletionResults = await Promise.allSettled(
      permissionsToDelete.map(({ permissionId, userEmails }) =>
        step.run(`delete-item-permissions-${permissionId}`, async () => {
          if (userEmails?.length) {
            return revokeUsersFromLinkPermission({
              token,
              siteId,
              driveId,
              itemId,
              permissionId,
              userEmails,
            });
          }

          return deleteItemPermission({
            token,
            siteId,
            driveId,
            itemId,
            permissionId,
          });
        })
      )
    );

    const deletedPermissions: PermissionToDelete[] = [];
    const ignoredPermissions: PermissionToDelete[] = [];
    const unexpectedFailedPermissions: (PermissionToDelete & { reason: unknown })[] = [];
    for (const [index, permissionDeletionResult] of permissionDeletionResults.entries()) {
      const { permissionId, userEmails } = permissionsToDelete[index]!; // eslint-disable-line @typescript-eslint/no-non-null-assertion -- can't be undefined
      if (permissionDeletionResult.status === 'rejected') {
        unexpectedFailedPermissions.push({
          permissionId,
          userEmails,
          reason: permissionDeletionResult.reason,
        });
      } else if (permissionDeletionResult.value === 'deleted') {
        deletedPermissions.push({ permissionId, userEmails });
      } else {
        ignoredPermissions.push({ permissionId, userEmails });
      }
    }

    if (unexpectedFailedPermissions.length) {
      logger.error('Unexpected errors occurred while revoking permissions', {
        organisationId,
        siteId,
        driveId,
        itemId,
        unexpectedFailedPermissions,
      });
    }

    return {
      deletedPermissions,
      ignoredPermissions,
      unexpectedFailedPermissions: unexpectedFailedPermissions.map(
        ({ permissionId, userEmails }) => ({
          permissionId,
          userEmails,
        })
      ),
    };
  }
);
