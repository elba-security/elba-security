import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getGoogleServiceAccountClient } from '@/connectors/google/clients';
import { db } from '@/database/client';
import { usersTable } from '@/database/schema';
import { deleteGooglePermission } from '@/connectors/google/permissions';

export type DeleteDataProtectionObjectPermissionsEvents = {
  'google/data_protection.delete_object_permissions.requested': DeleteDataProtectionObjectPermissionsRequested;
};

type DeleteDataProtectionObjectPermissionsRequested = {
  data: {
    organisationId: string;
    objectId: string;
    ownerId: string;
    permissionIds: string[];
  };
};

export const deleteDataProtectionObjectPermissions = inngest.createFunction(
  {
    id: 'google-delete-data-protection-object-permissions',
    retries: 3,
    concurrency: {
      limit: 1,
    },
    cancelOn: [
      {
        event: 'google/common.organisation.inserted',
        match: 'data.organisationId',
      },
      {
        event: 'google/common.remove_organisation.requested',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'google/data_protection.delete_object_permissions.requested' },
  async ({
    event: {
      data: { organisationId, objectId, ownerId, permissionIds },
    },
    step,
    logger,
  }) => {
    const user = await db.query.usersTable.findFirst({
      where: and(eq(usersTable.organisationId, organisationId), eq(usersTable.id, ownerId)),
      columns: {
        email: true,
      },
      with: {
        organisation: {
          columns: {
            region: true,
          },
        },
      },
    });

    if (!user) {
      throw new NonRetriableError('User not found');
    }

    const authClient = await getGoogleServiceAccountClient(user.email);
    const permissionDeletionResults = await Promise.allSettled(
      permissionIds.map(async (permissionId) =>
        step.run(`delete-permission-${permissionId}`, async () => {
          try {
            await deleteGooglePermission({
              auth: authClient,
              fileId: objectId,
              permissionId,
            });

            return { status: 'deleted' };
            /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Start of error handling */
          } catch (error: any) {
            const ignoredErrors = [
              { code: 404, reason: 'notFound' },
              { code: 403, reason: 'insufficientFilePermissions' },
            ] as const;
            for (const ignoredError of ignoredErrors) {
              if (
                error?.code === ignoredError.code &&
                error?.errors?.[0]?.reason === ignoredError.reason
              ) {
                return { status: 'ignored', reason: ignoredError.reason };
              }
            }
            /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- End of error handling */

            throw error;
          }
        })
      )
    );

    const deletedPermissions: string[] = [];
    const ignoredPermissions: string[] = [];
    const unexpectedFailedPermissions: { permissionId: string; reason: any }[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any -- to log errors
    for (const [index, permissionDeletionResult] of permissionDeletionResults.entries()) {
      const permissionId = permissionIds[index]!; // eslint-disable-line @typescript-eslint/no-non-null-assertion -- can't be undefined
      if (permissionDeletionResult.status === 'rejected') {
        unexpectedFailedPermissions.push({
          permissionId,
          reason: permissionDeletionResult.reason, // eslint-disable-line @typescript-eslint/no-unsafe-assignment -- to log errors
        });
      } else if (permissionDeletionResult.value.status === 'deleted') {
        deletedPermissions.push(permissionId);
      } else {
        ignoredPermissions.push(permissionId);
      }
    }

    if (unexpectedFailedPermissions.length) {
      logger.error('Unexpected errors occurred while revoking permissions', {
        organisationId,
        objectId,
        ownerId,
        unexpectedFailedPermissions,
      });
    }

    return {
      deletedPermissions,
      ignoredPermissions,
      unexpectedFailedPermissionIds: unexpectedFailedPermissions.map(
        ({ permissionId }) => permissionId
      ),
    };
  }
);
