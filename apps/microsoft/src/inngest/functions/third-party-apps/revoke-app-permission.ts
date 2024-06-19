import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { deleteAppPermission, deleteOauthGrant } from '@/connectors/microsoft/apps';
import { getOrganisation } from '@/inngest/common/organisations';

export const revokeAppPermission = inngest.createFunction(
  {
    id: 'microsoft-revoke-app-permission',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    cancelOn: [
      {
        event: 'microsoft/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: env.THIRD_PARTY_APPS_REVOKE_APP_PERMISSION_MAX_RETRY,
  },
  {
    event: 'microsoft/third_party_apps.revoke_app_permission.requested',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 10,
    },
  },
  async ({ event, logger, step }) => {
    const { organisationId, appId, permissionId, oauthGrantIds } = event.data;

    if (!permissionId && !oauthGrantIds?.length) {
      logger.warn('No permissions or oauth grant to delete', { appId, organisationId });
      return { status: 'ignored' };
    }

    const organisation = await getOrganisation(organisationId);

    const token = await decrypt(organisation.token);

    if (oauthGrantIds) {
      for (let i = 0; i < oauthGrantIds.length; i++) {
        // eslint-disable-next-line no-await-in-loop -- convenience
        await step.run(`delete-oauth-grant-${i}`, async () => {
          await deleteOauthGrant({
            token,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- convenience
            oauthGrantId: oauthGrantIds[i]!,
          });
        });
      }
    }

    if (permissionId) {
      await step.run(`delete-app-user-permission`, async () => {
        await deleteAppPermission({
          tenantId: organisation.tenantId,
          token,
          appId,
          permissionId,
        });
      });
    }

    return { status: 'deleted' };
  }
);
