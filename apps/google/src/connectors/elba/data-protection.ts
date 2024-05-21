import type { DataProtectionObject, DataProtectionObjectPermission } from '@elba-security/sdk';
import type { infer as zInfer } from 'zod';
import { z } from 'zod';
import type { GoogleFileNonInheritedPermission } from '../google/permissions';
import type { GoogleFile } from '../google/files';

export const fileMetadataSchema = z.object({
  ownerId: z.string().min(1),
});

export type FileMetadata = zInfer<typeof fileMetadataSchema>;

export const formatDataProtectionObject = ({
  file,
  owner,
  permissions,
}: {
  file: GoogleFile;
  owner: string;
  permissions: GoogleFileNonInheritedPermission[];
}): DataProtectionObject => {
  return {
    id: file.id,
    name: file.name,
    ownerId: owner,
    url: `https://drive.google.com/open?id=${file.id}`,
    lastAccessedAt: file.viewedByMeTime,
    contentHash: file.sha256Checksum,
    permissions: permissions.map((permission) => formatDataProtectionObjectPermission(permission)),
    metadata: {
      ownerId: owner,
    } satisfies FileMetadata,
  };
};

export const formatDataProtectionObjectPermission = (
  permission: GoogleFileNonInheritedPermission
): DataProtectionObjectPermission => {
  return {
    id: permission.id,
    type: (permission.type === 'group' ? 'user' : permission.type) as never,
    email: permission.emailAddress,
    domain: permission.domain || permission.emailAddress?.split('@')[1],
  };
};
