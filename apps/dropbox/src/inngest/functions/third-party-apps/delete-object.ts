import { inngest } from '@/inngest/client';
import { env } from '@/common/env';
import { revokeMemberLinkedApp } from '@/connectors/dropbox/apps';
import { nangoAPIClient } from '@/common/nango';

export const deleteThirdPartyAppsObject = inngest.createFunction(
  {
    id: 'dropbox-third-party-apps-delete-objects',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 5,
    concurrency: {
      limit: env.DROPBOX_TPA_DELETE_OBJECT_CONCURRENCY,
      key: 'event.data.organisationId',
    },
  },
  { event: 'dropbox/third_party_apps.delete_object.requested' },
  async ({ step, event }) => {
    const { userId, appId, nangoConnectionId } = event.data;
    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

    const accessToken = credentials.access_token;

    await step.run('delete-object', async () => {
      await revokeMemberLinkedApp({
        accessToken,
        teamMemberId: userId,
        appId,
      });
    });
  }
);
