import { logger } from '@elba-security/logger';
import { nangoAPIClient } from '@/common/nango';
import { removePermission } from '@/connectors/dropbox/permissions';
import { inngest } from '@/inngest/client';
import { getSharedLinksByPath } from '@/connectors/dropbox/shared-links';
import { getCurrentUserAccount } from '@/connectors/dropbox/users';
import { getAuthenticatedAdmin } from '@/connectors/dropbox/users';

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
    const { objectId, metadata, permission, nangoConnectionId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new Error('Could not retrieve Nango credentials');
    }
    const { teamMemberId } = await getAuthenticatedAdmin(credentials.access_token);
    const { rootNamespaceId: pathRoot } = await getCurrentUserAccount({
      accessToken: credentials.access_token,
      teamMemberId,
    });

    const result = await step.run('delete-permission', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return await removePermission({
        accessToken: credentials.access_token,
        adminTeamMemberId: teamMemberId,
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
        teamMemberId: metadata.ownerId,
        accessToken: credentials.access_token,
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
