import { inngest } from '@/inngest/client';
import { deleteSpacePermission } from '@/connectors/confluence/space-permissions';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';
import { getInstance } from '@/connectors/confluence/auth';

export const deleteSpacePermissions = inngest.createFunction(
  {
    id: 'confluence-delete-space-permissions',
    cancelOn: [
      {
        event: 'confluence/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'confluence/app.installed',
        match: 'data.organisationId',
      },
    ],
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.DATA_PROTECTION_DELETE_SPACE_PERMISSIONS_ORGANISATION_CONCURRENCY,
    },
    retries: env.DATA_PROTECTION_DELETE_SPACE_PERMISSIONS_MAX_RETRY,
  },
  {
    event: 'confluence/data_protection.delete_space_permissions.requested',
  },
  async ({ event }) => {
    const { spaceKey, permissionIds, nangoConnectionId } = event.data;
    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');
    const instance = await getInstance(credentials.access_token);
    const accessToken = credentials.access_token;

    await Promise.all(
      permissionIds.map((permissionId) =>
        deleteSpacePermission({
          accessToken,
          instanceId: instance.id,
          spaceKey,
          id: permissionId,
        })
      )
    );
  }
);
