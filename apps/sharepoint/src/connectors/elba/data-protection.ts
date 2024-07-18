import { type DataProtectionObject, type DataProtectionObjectPermission } from '@elba-security/sdk';
import { z } from 'zod';
import { type ItemWithPermissions } from '@/inngest/functions/data-protection/common/types';
import { type SharepointPermission } from '../microsoft/sharepoint/permissions';

export const objectMetadataSchema = z.object({
  siteId: z.string(),
  driveId: z.string(),
});

type ObjectMetadata = z.infer<typeof objectMetadataSchema>;

export const userPermissionMetadataSchema = z.object({
  type: z.literal('user'),
  email: z.string(),
  linksPermissionIds: z.array(z.string()),
  directPermissionId: z.string().optional(),
});

export type UserPermissionMetadata = z.infer<typeof userPermissionMetadataSchema>;

export const anyonePermissionMetadataSchema = z.object({
  type: z.literal('anyone'),
  permissionIds: z.array(z.string()),
});

export type AnyonePermissionMetadata = z.infer<typeof anyonePermissionMetadataSchema>;

export const permissionMetadataSchema = z.union([
  userPermissionMetadataSchema,
  anyonePermissionMetadataSchema,
]);

export type PermissionMetadata = z.infer<typeof permissionMetadataSchema>;

const formatDataProtectionPermissions = (permissions: SharepointPermission[]) => {
  const usersPermissions = new Map<string, UserPermissionMetadata & { userId?: string }>();
  const anyonePermissionIds = new Set<string>();

  for (const permission of permissions) {
    if (permission.link?.scope === 'anonymous') {
      anyonePermissionIds.add(permission.id);
    }

    if (permission.grantedToV2?.user) {
      const userEmail = permission.grantedToV2.user.email;

      let userPermissions = usersPermissions.get(userEmail);
      if (!userPermissions) {
        userPermissions = {
          type: 'user',
          userId: permission.grantedToV2.user.id,
          email: permission.grantedToV2.user.email,
          linksPermissionIds: [],
        };
        usersPermissions.set(userEmail, userPermissions);
      }
      userPermissions.directPermissionId = permission.id;
    }

    if (permission.link?.scope === 'users' && permission.grantedToIdentitiesV2?.length) {
      for (const identity of permission.grantedToIdentitiesV2) {
        if (!identity.user) {
          continue;
        }
        const userEmail = identity.user.email;

        let userPermissions = usersPermissions.get(userEmail);
        if (!userPermissions) {
          userPermissions = {
            type: 'user',
            userId: identity.user.id,
            email: identity.user.email,
            linksPermissionIds: [],
          };
          usersPermissions.set(userEmail, userPermissions);
        }
        userPermissions.linksPermissionIds.push(permission.id);
      }
    }
  }

  const elbaPermissions: DataProtectionObjectPermission[] = [];
  if (anyonePermissionIds.size) {
    elbaPermissions.push({
      id: 'anyone',
      type: 'anyone',
      metadata: {
        type: 'anyone',
        permissionIds: [...anyonePermissionIds],
      } satisfies AnyonePermissionMetadata,
    });
  }

  if (usersPermissions.size) {
    for (const [userEmail, { userId, ...metadata }] of usersPermissions.entries()) {
      elbaPermissions.push({
        id: `user-${userId || userEmail}`,
        type: 'user',
        email: userEmail,
        userId,
        metadata,
      });
    }
  }

  return elbaPermissions;
};

export const formatDataProtectionObjects = ({
  items,
  siteId,
  driveId,
  parentPermissionIds,
}: {
  items: ItemWithPermissions[];
  siteId: string;
  driveId: string;
  parentPermissionIds: string[];
}): DataProtectionObject[] => {
  const objects: DataProtectionObject[] = [];
  const parentPermissions = new Set(parentPermissionIds);

  for (const { item, permissions } of items) {
    // TODO: is item creator always the owner? - Check with a deleted user
    if (item.createdBy.user.id) {
      const ownPermissions = permissions.filter(({ id }) => !parentPermissions.has(id));
      const formattedPermissions = formatDataProtectionPermissions(ownPermissions);
      if (formattedPermissions.length) {
        const object = {
          id: item.id,
          name: item.name,
          url: item.webUrl,
          ownerId: item.createdBy.user.id,
          metadata: {
            siteId,
            driveId,
          } satisfies ObjectMetadata,
          updatedAt: item.lastModifiedDateTime,
          permissions: formattedPermissions,
        };

        objects.push(object);
      }
    }
  }

  return objects;
};
