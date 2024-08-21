import { z } from 'zod';
import { type DataProtectionPermission } from '@elba-security/schemas';
import { type File } from '@/connectors/dropbox/folders-and-files';
import { type FolderAndFilePermissions } from './permissions';

export const fileMetadataSchema = z.object({
  ownerId: z.string(),
  type: z.union([z.literal('file'), z.literal('folder')]),
  isPersonal: z.boolean(),
});

export type FileMetadata = z.infer<typeof fileMetadataSchema>;

export const permissionSchema = z.object({
  id: z.string(),
  metadata: z
    .object({
      sharedLinks: z.array(z.string()),
    })
    .nullable(),
});

export type Permission = z.infer<typeof permissionSchema>;

export const deletePermissionsSchema = z.array(permissionSchema);

// Format file to add
export type FileToAdd = File & {
  permissions: FolderAndFilePermissions[];
  metadata: {
    name: string;
    preview_url: string;
  };
};

export const formatFilesToAdd = ({
  files,
  teamMemberId,
}: {
  files: FileToAdd[];
  teamMemberId: string;
}) => {
  return files.flatMap((file) => {
    const sourceOwner = file.permissions.find((permission) => permission.role === 'owner');
    const isPersonal = sourceOwner?.team_member_id === teamMemberId;

    if (!file.permissions.length) {
      return [];
    }

    // If personal folder is shared with other team members, this shared folder will appear  for both team members
    // therefore we need to filter out the files that are not belong to the current team member
    if (sourceOwner && !isPersonal) {
      return [];
    }

    return {
      id: file.id,
      name: file.name,
      ownerId: teamMemberId,
      url: file.metadata.preview_url,
      contentHash: file.content_hash,
      metadata: {
        ownerId: teamMemberId,
        isPersonal,
        type: 'file',
      },
      permissions: file.permissions.map(({ id, type, email, metadata }) => {
        return {
          id,
          type,
          ...(email && { email }), // Optional for anyone
          metadata,
        };
      }) as DataProtectionPermission[],
    };
  });
};
