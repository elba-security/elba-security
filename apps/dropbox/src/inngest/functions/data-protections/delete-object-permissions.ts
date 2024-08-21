import { logger } from '@elba-security/logger';
import { decrypt } from '@/common/crypto';
import { removePermission } from '@/connectors/dropbox/permissions';
import { getOrganisation } from '@/database/organisations';
import { inngest } from '@/inngest/client';

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

    const { accessToken, adminTeamMemberId } = await getOrganisation(organisationId);

    const token = await decrypt(accessToken);

    const result = await step.run('delete-permission', async () => {
      return await removePermission({
        accessToken: token,
        adminTeamMemberId,
        objectId,
        metadata,
        permission,
      });
    });

    logger.info('Permission removed', { result });
  }
);
