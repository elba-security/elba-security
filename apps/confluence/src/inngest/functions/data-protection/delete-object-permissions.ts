import { inngest } from '@/inngest/client';
import type {
  PageObjectPermissionMetadata,
  SpaceObjectPermissionMetadata,
} from '@/connectors/elba/data-protection/metadata';
import { env } from '@/common/env';

const chunkArray = <T>(entries: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < entries.length; i += size) {
    result.push(entries.slice(i, i + size));
  }
  return result;
};

export const deleteObjectPermissions = inngest.createFunction(
  {
    id: 'confluence-delete-object-permissions',
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
      limit: env.DATA_PROTECTION_DELETE_OBJECT_PERMISSIONS_ORGANISATION_CONCURRENCY,
    },
    retries: env.DATA_PROTECTION_DELETE_OBJECT_PERMISSIONS_MAX_RETRY,
  },
  {
    event: 'confluence/data_protection.delete_object_permissions.requested',
  },
  async ({ event, step }) => {
    const { organisationId, objectId, permissions, metadata } = event.data;

    // To avoid creating too many events: we delete permissions/restrictions in batches.
    if (metadata.objectType === 'page') {
      await step.sendEvent(
        'request-delete-page-restrictions',
        chunkArray(permissions, env.DATA_PROTECTION_DELETE_PAGE_RETRICTIONS_BATCH_SIZE).map(
          (pagePermissions) => ({
            name: 'confluence/data_protection.delete_page_restrictions.requested',
            data: {
              organisationId,
              userIds: pagePermissions.map(
                (permission) => (permission.metadata as PageObjectPermissionMetadata).userId
              ),
              pageId: objectId,
            },
          })
        )
      );
    } else {
      await step.sendEvent(
        'request-delete-space-permissions',
        chunkArray(
          permissions.flatMap(
            (permission) => (permission.metadata as SpaceObjectPermissionMetadata).ids
          ),
          env.DATA_PROTECTION_DELETE_SPACE_PERMISSIONS_BATCH_SIZE
        ).map((permissionIds) => ({
          name: 'confluence/data_protection.delete_space_permissions.requested',
          data: {
            organisationId,
            spaceKey: metadata.key,
            permissionIds,
          },
        }))
      );
    }
  }
);
