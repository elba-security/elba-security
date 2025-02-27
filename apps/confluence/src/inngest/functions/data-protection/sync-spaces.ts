import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getSpacesWithPermissions } from '@/connectors/confluence/spaces';
import { formatSpaceObject } from '@/connectors/elba/data-protection/objects';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';
import { getInstance } from '@/connectors/confluence/auth';
import { getOrganisationUsers } from '../../common/users';

/**
 * This function first iteration over global spaces then pivot to personal spaces syncing.
 * The amount of permissions retrieved depend on the space type.
 */
export const syncSpaces = inngest.createFunction(
  {
    id: 'confluence-sync-spaces',
    cancelOn: [
      {
        event: 'confluence/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'confluence/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'confluence/sync.cancel',
        match: 'data.organisationId',
      },
    ],
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: env.DATA_PROTECTION_SYNC_SPACES_MAX_RETRY,
  },
  {
    event: 'confluence/data_protection.spaces.sync.requested',
  },
  async ({ event, step }) => {
    const { organisationId, cursor, type, syncStartedAt, isFirstSync, nangoConnectionId, region } =
      event.data;
    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new NonRetriableError('Could not retrieve Nango credentials');
    }
    const instance = await getInstance(credentials.access_token);
    const accessToken = credentials.access_token;

    const nextCursor = await step.run('paginate-spaces', async () => {
      const users = await getOrganisationUsers(organisationId);
      const result = await getSpacesWithPermissions({
        accessToken,
        instanceId: instance.id,
        cursor,
        type,
        limit:
          type === 'personal'
            ? env.DATA_PROTECTION_PERSONAL_SPACE_BATCH_SIZE
            : env.DATA_PROTECTION_GLOBAL_SPACE_BATCH_SIZE,
        permissionsMaxPage:
          type === 'personal'
            ? env.DATA_PROTECTION_PERSONAL_SPACE_PERMISSIONS_MAX_PAGE
            : env.DATA_PROTECTION_GLOBAL_SPACE_PERMISSIONS_MAX_PAGE,
      });

      const objects = result.spaces
        .map((space) =>
          formatSpaceObject(space, {
            instanceUrl: instance.url,
            instanceId: instance.id,
            users,
          })
        )
        .filter((object) => object.permissions.length > 0);

      const elba = createElbaOrganisationClient({ organisationId, region });
      await elba.dataProtection.updateObjects({ objects });

      return result.cursor;
    });

    if (nextCursor || type === 'global') {
      await step.sendEvent('request-next-spaces-sync', {
        name: 'confluence/data_protection.spaces.sync.requested',
        data: {
          nangoConnectionId,
          region,
          organisationId,
          isFirstSync,
          syncStartedAt,
          // when global spaces are all synced we pivot to personal space syncing
          type: nextCursor ? type : 'personal',
          cursor: nextCursor,
        },
      });

      return {
        status: 'ongoing',
      };
    }

    await step.sendEvent('request-pages-sync', {
      name: 'confluence/data_protection.pages.sync.requested',
      data: {
        nangoConnectionId,
        region,
        organisationId,
        isFirstSync: event.data.isFirstSync,
        syncStartedAt,
        cursor: null,
      },
    });

    return {
      status: 'completed',
    };
  }
);
