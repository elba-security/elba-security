import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getGoogleServiceAccountClient } from '@/connectors/google/clients';
import { db } from '@/database/client';
import { usersTable } from '@/database/schema';
import { getGoogleFile } from '@/connectors/google/files';
import { listAllGoogleFileNonInheritedPermissions } from '@/connectors/google/permissions';
import { formatDataProtectionObject } from '@/connectors/elba/data-protection';
import { getElbaClient } from '@/connectors/elba/client';

export type RefreshDataProtectionObjectEvents = {
  'google/data_protection.refresh_object.requested': RefreshDataProtectionObjectRequested;
};

type RefreshDataProtectionObjectRequested = {
  data: {
    organisationId: string;
    objectId: string;
    ownerId: string;
  };
};

export const refreshDataProtectionObject = inngest.createFunction(
  {
    id: 'google-refresh-data-protection-object',
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
  { event: 'google/data_protection.refresh_object.requested' },
  async ({
    event: {
      data: { organisationId, objectId, ownerId },
    },
    step,
  }) => {
    const user = await step.run('get-user', async () => {
      return db.query.usersTable.findFirst({
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
    });

    if (!user) {
      throw new NonRetriableError('User not found');
    }

    const authClient = await getGoogleServiceAccountClient(user.email);
    const elba = getElbaClient({ organisationId, region: user.organisation.region });

    try {
      const file = await step.run('get-file', async () => {
        return getGoogleFile({
          auth: authClient,
          fileId: objectId,
        });
      });
      const permissions = await step.run('list-permissions', async () => {
        return listAllGoogleFileNonInheritedPermissions({
          auth: authClient,
          fileId: objectId,
        });
      });

      const object = formatDataProtectionObject({ file, owner: ownerId, permissions });

      await elba.dataProtection.updateObjects({ objects: [object] });

      return { status: 'updated' };

      /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Start of error handling */
    } catch (error: any) {
      if (error?.code === 404) {
        /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- End of error handling */

        await elba.dataProtection.deleteObjects({ ids: [objectId] });

        return { status: 'deleted' };
      }

      throw error;
    }
  }
);
