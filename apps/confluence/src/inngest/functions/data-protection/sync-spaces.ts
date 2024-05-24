import { inngest } from '@/inngest/client';
import { getSpacesWithPermissions } from '@/connectors/confluence/spaces';
import { formatSpaceObject } from '@/connectors/elba/data-protection/objects';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';
import { getOrganisationUsers } from '../../common/users';
import { getOrganisation } from '../../common/organisations';

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
    const { organisationId, cursor, type, syncStartedAt } = event.data;
    const organisation = await step.run('get-organisation', () => getOrganisation(organisationId));

    const nextCursor = await step.run('paginate-spaces', async () => {
      const users = await getOrganisationUsers(organisationId);
      const result = await getSpacesWithPermissions({
        accessToken: await decrypt(organisation.accessToken),
        instanceId: organisation.instanceId,
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
            instanceUrl: organisation.instanceUrl,
            instanceId: organisation.instanceId,
            users,
          })
        )
        .filter((object) => object.permissions.length > 0);

      const elba = createElbaClient(organisation.id, organisation.region);
      await elba.dataProtection.updateObjects({ objects });

      return result.cursor;
    });

    if (nextCursor || type === 'global') {
      await step.sendEvent('request-next-spaces-sync', {
        name: 'confluence/data_protection.spaces.sync.requested',
        data: {
          ...event.data,
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
