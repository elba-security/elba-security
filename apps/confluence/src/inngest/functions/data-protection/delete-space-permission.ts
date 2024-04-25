import { inngest } from '@/inngest/client';
import { deleteSpacePermission } from '@/connectors/confluence/space-permissions';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';
import { getOrganisation } from '../../common/organisations';

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
    const { organisationId, spaceKey, permissionIds } = event.data;
    const organisation = await getOrganisation(organisationId);
    const accessToken = await decrypt(organisation.accessToken);

    await Promise.all(
      permissionIds.map((permissionId) =>
        deleteSpacePermission({
          accessToken,
          instanceId: organisation.instanceId,
          spaceKey,
          id: permissionId,
        })
      )
    );
  }
);
