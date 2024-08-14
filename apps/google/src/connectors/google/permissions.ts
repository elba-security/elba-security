import type { infer as zInfer } from 'zod';
import { z } from 'zod';
import { drive_v3 as drive } from '@googleapis/drive';

export const googleFileNonInheritedPermissionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['user', 'group', 'domain', 'anyone']),
  emailAddress: z.string().email().optional(),
  domain: z.string().min(1).optional(),
  permissionDetails: z.array(z.any()).length(0).optional(),
});

export const googleSharedDriveManagerPermissionSchema = z.object({
  // id: z.string().min(1),
  type: z.enum(['user', 'group']),
  emailAddress: z.string().email(),
  role: z.enum(['organizer']),
});

export type GoogleFileNonInheritedPermission = zInfer<
  typeof googleFileNonInheritedPermissionSchema
>;
export type GoogleSharedDriveManagerPermission = zInfer<
  typeof googleSharedDriveManagerPermissionSchema
>;

const googleFilePermissionFields = [
  'emailAddress',
  'id',
  'domain',
  'type',
  'permissionDetails/inheritedFrom',
];

const googleSharedDriveManagerPermissionFields = ['emailAddress', 'id', 'role', 'type'];

export const deleteGooglePermission = async ({
  supportsAllDrives = true,
  ...deletePermissionParams
}: drive.Params$Resource$Permissions$Delete) => {
  return new drive.Drive({}).permissions.delete({
    ...deletePermissionParams,
    supportsAllDrives,
  });
};

const listPermissions = async <T>(
  { supportsAllDrives = true, ...listPermissionsParams }: drive.Params$Resource$Permissions$List,
  schema: z.Schema<T>
) => {
  const {
    data: { permissions: googlePermissions, nextPageToken },
  } = await new drive.Drive({}).permissions.list({
    ...listPermissionsParams,
    supportsAllDrives,
  });

  const permissions: T[] = [];
  for (const permission of googlePermissions || []) {
    const result = schema.safeParse(permission);
    if (result.success) {
      permissions.push(result.data);
    }
  }

  return { permissions, nextPageToken };
};

export const listGoogleFileNonInheritedPermissions = async ({
  fields = [
    ...googleFilePermissionFields.map((field) => `permissions/${field}`),
    'nextPageToken',
  ].join(','),
  ...listPermissionsParams
}: drive.Params$Resource$Permissions$List) => {
  return listPermissions(
    {
      ...listPermissionsParams,
      fields,
    },
    googleFileNonInheritedPermissionSchema
  );
};

export const listAllGoogleFileNonInheritedPermissions = async (
  listPermissionsParams: drive.Params$Resource$Permissions$List
) => {
  let pageToken: string | undefined;
  const permissions: GoogleFileNonInheritedPermission[] = [];
  do {
    const { permissions: pagePermissions, nextPageToken } =
      await listGoogleFileNonInheritedPermissions({
        ...listPermissionsParams,
        pageToken,
      });
    permissions.push(...pagePermissions);
    pageToken = nextPageToken ?? undefined;
  } while (pageToken);

  return permissions;
};

export const listGoogleSharedDriveManagerPermissions = async ({
  fields = [
    ...googleSharedDriveManagerPermissionFields.map((field) => `permissions/${field}`),
    'nextPageToken',
  ].join(','),
  useDomainAdminAccess = true,
  ...listPermissionsParams
}: drive.Params$Resource$Permissions$List) => {
  return listPermissions(
    {
      ...listPermissionsParams,
      fields,
      useDomainAdminAccess,
    },
    googleSharedDriveManagerPermissionSchema
  );
};

export const listAllGoogleSharedDriveManagerPermissions = async (
  listPermissionsParams: drive.Params$Resource$Permissions$List
) => {
  let pageToken: string | undefined;
  const permissions: GoogleSharedDriveManagerPermission[] = [];
  do {
    const { permissions: pagePermissions, nextPageToken } =
      await listGoogleSharedDriveManagerPermissions({
        ...listPermissionsParams,
        pageToken,
      });
    permissions.push(...pagePermissions);
    pageToken = nextPageToken ?? undefined;
  } while (pageToken);

  return permissions;
};
