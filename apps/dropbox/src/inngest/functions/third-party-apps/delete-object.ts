import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';
import { getOrganisation } from '@/database/organisations';
import { revokeMemberLinkedApp } from '@/connectors/dropbox/apps';

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
    const { organisationId, userId, appId } = event.data;
    const organisation = await getOrganisation(organisationId);
    const accessToken = await decrypt(organisation.accessToken);

    await step.run('delete-object', async () => {
      await revokeMemberLinkedApp({
        accessToken,
        teamMemberId: userId,
        appId,
      });
    });
  }
);
