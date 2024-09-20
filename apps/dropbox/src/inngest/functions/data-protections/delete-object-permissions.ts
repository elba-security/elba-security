import { logger } from '@elba-security/logger';
import { decrypt } from '@/common/crypto';
import { removePermission } from '@/connectors/dropbox/permissions';
import { getOrganisation } from '@/database/organisations';
import { inngest } from '@/inngest/client';
import { getSharedLinksByPath } from '@/connectors/dropbox/shared-links';

export const deleteObjectPermissions = inngest.createFunction(
  {
    id: 'dropbox-delete-data-protection-object-permission',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 10,
      key: 'event.data.organisationId',
    },
  },
  { event: 'dropbox/data_protection.delete_object_permission.requested' },
  async ({ event, step }) => {
    const { organisationId, objectId, metadata, permission } = event.data;
    const { accessToken, adminTeamMemberId, pathRoot } = await getOrganisation(organisationId);

    const decryptedAccessToken = await decrypt(accessToken);

    const result = await step.run('delete-permission', async () => {
      return await removePermission({
        accessToken: decryptedAccessToken,
        adminTeamMemberId,
        objectId,
        metadata,
        permission,
      });
    });

    logger.info('Permission removed', { result });

    // Listing Shared Links API has a bug it fails to list edit and view links together,
    // therefore we need to make sure there aren't any links left
    if (permission.metadata?.sharedLinks && permission.metadata.sharedLinks.length > 0) {
      const isFile = metadata.type === 'file';
      const path = isFile ? objectId : `ns:${objectId}`;

      const sharedLinks = await getSharedLinksByPath({
        accessToken: decryptedAccessToken,
        teamMemberId: metadata.ownerId,
        pathRoot,
        isPersonal: metadata.isPersonal,
        path,
      });

      if (sharedLinks.length > 0) {
        logger.info('Shared links still exist', { sharedLinks });

        await step.sendEvent(`delete-leftover-shared-links`, {
          name: 'dropbox/data_protection.delete_object_permission.requested',
          data: {
            ...event.data,
            permission: {
              id: permission.id,
              metadata: {
                sharedLinks: sharedLinks.map((link) => link.url),
              },
            },
          },
        });
      }
    }
  }
);
