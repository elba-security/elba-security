import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { deleteAppPermission, deleteOauthGrant } from '@/connectors/microsoft/apps';

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
  async ({ event, logger }) => {
    const { organisationId, appId, permissionId, oauthGrantIds } = event.data;

    if (!permissionId && !oauthGrantIds?.length) {
      logger.warn('No permissions or oauth grant to delete', { appId, organisationId });
      return { status: 'ignored' };
    }

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
        tenantId: organisationsTable.tenantId,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const token = await decrypt(organisation.token);

    await Promise.all([
      // oauthGrantIds max length is 2
      ...(oauthGrantIds?.map((oauthGrantId) =>
        deleteOauthGrant({
          token,
          oauthGrantId,
        })
      ) ?? []),
      permissionId &&
        deleteAppPermission({
          tenantId: organisation.tenantId,
          token,
          appId,
          permissionId,
        }),
    ]);

    return { status: 'deleted' };
  }
);
