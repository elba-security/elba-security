import { z } from 'zod';
import { type DataProtectionPermission } from '@elba-security/schemas';
import { type Folder } from '@/connectors/dropbox/folders-and-files';
import { type FolderAndFilePermissions } from './permissions';

export const fileMetadataSchema = z.object({
  ownerId: z.string(),
  type: z.union([z.literal('file'), z.literal('folder')]),
  isPersonal: z.boolean(),
});

export type FileMetadata = z.infer<typeof fileMetadataSchema>;

export const permissionSchema = z.object({
  id: z.string(),
  metadata: z.object({
    sharedLinks: z.array(z.string()).optional(),
  }),
});

export type Permission = z.infer<typeof permissionSchema>;

export const deletePermissionsSchema = z.array(permissionSchema);

// Format file to add
export type FolderToAdd = Folder & {
  permissions: FolderAndFilePermissions[];
  metadata: {
    name: string;
    preview_url: string;
  };
};

export const formatFoldersToAdd = ({
  folders,
  teamMemberId,
}: {
  folders: FolderToAdd[];
  teamMemberId: string;
}) => {
  return folders.flatMap((folder) => {
    const sourceOwner = folder.permissions.find((permission) => permission.role === 'owner');
    const isPersonal = sourceOwner?.team_member_id === teamMemberId;

    if (!folder.permissions.length) {
      return [];
    }

    // If personal folder is shared with other team members, this shared folder will appear  for both team members
    // therefore we need to filter out the files that are not belong to the current team member
    if (sourceOwner && !isPersonal) {
      return [];
    }

    // IF the  folder doesn't have shared_folder_id, ignore it
    if (!folder.sharing_info?.shared_folder_id) {
      return [];
    }

    return {
      id: folder.sharing_info.shared_folder_id,
      name: folder.name,
      ownerId: teamMemberId,
      url: folder.metadata.preview_url,
      metadata: {
        ownerId: teamMemberId,
        isPersonal,
        type: 'folder',
      },
      permissions: folder.permissions.map(({ id, type, email, metadata }) => {
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
