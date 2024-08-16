import { z } from 'zod';
import { env } from '@/common/env';
import { DropboxError } from '../common/error';
import { type FilteredSharedLink } from '../elba/data-protection/shared-link';
import { formatPermissions } from '../elba/data-protection/permissions';
import { formatFoldersToAdd } from '../elba/data-protection/folders';
import {
  type GeneralFolderFilePermissions,
  type FolderFilePermissions,
  fileFolderPermissionsSchema,
} from './files';
import { type Folder } from './folders-and-files';

export const getFoldersPermissions = async ({
  accessToken,
  teamMemberId,
  folders,
}: {
  accessToken: string;
  teamMemberId: string;
  folders: Folder[];
}) => {
  const permissions: FolderFilePermissions = new Map();
  await Promise.all(
    folders.map(async ({ id: folderId, sharing_info: sharingInfo }: Folder) => {
      if (!sharingInfo) {
        throw new Error('Missing shared_folder_id');
      }

      const folderPermissions: GeneralFolderFilePermissions = {
        users: [],
        groups: [],
        invitees: [],
      };

      let nextCursor: string | undefined;
      do {
        const response = await fetch(
          `${env.DROPBOX_API_BASE_URL}/2/sharing/list_folder_members${
            nextCursor ? '/continue' : ''
          }`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
              'Dropbox-API-Select-User': teamMemberId,
            },
            body: JSON.stringify(
              nextCursor
                ? { cursor: nextCursor }
                : {
                    shared_folder_id: sharingInfo.shared_folder_id,
                    limit: env.DROPBOX_LIST_FOLDER_MEMBERS_LIMIT,
                  }
            ),
          }
        );

        if (!response.ok) {
          throw await DropboxError.fromResponse('Could not retrieve shared links', { response });
        }

        const data: unknown = await response.json();

        const { users, groups, invitees, cursor } = fileFolderPermissionsSchema.parse(data);

        folderPermissions.users.push(...users);
        folderPermissions.groups.push(...groups);
        folderPermissions.invitees.push(...invitees);
        nextCursor = cursor;
      } while (nextCursor);

      permissions.set(folderId, folderPermissions);
    })
  );

  return permissions;
};

const foldersMetadataResponseSchema = z.object({
  name: z.string(),
  folder_id: z.string(),
  preview_url: z.string(),
  shared_folder_id: z.string(),
});

export type FolderMetadata = z.infer<typeof foldersMetadataResponseSchema>;

export const getFoldersMetadata = async ({
  accessToken,
  teamMemberId,
  folders,
}: {
  accessToken: string;
  teamMemberId: string;
  folders: Folder[];
}) => {
  const sharedFolderMetadata = new Map<
    string,
    {
      name: string;
      preview_url: string;
    }
  >();

  const metadataResult = await Promise.all(
    folders.map(async ({ sharing_info: sharingInfo }: Folder) => {
      if (!sharingInfo) {
        throw new Error('Missing sharing folder Info');
      }

      const response = await fetch(`${env.DROPBOX_API_BASE_URL}/2/sharing/get_folder_metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'Dropbox-API-Select-User': teamMemberId,
        },
        body: JSON.stringify({
          shared_folder_id: sharingInfo.shared_folder_id,
          actions: [],
        }),
      });

      if (!response.ok) {
        throw await DropboxError.fromResponse('Could not retrieve shared links', { response });
      }

      const data: unknown = await response.json();

      const folderResult = foldersMetadataResponseSchema.parse(data);

      return folderResult;
    })
  );

  for (const { shared_folder_id: sharedFolderId, ...rest } of metadataResult) {
    sharedFolderMetadata.set(sharedFolderId, rest);
  }

  return sharedFolderMetadata;
};

export const getFoldersMetadataMembersAndMapDetails = async ({
  accessToken,
  teamMemberId,
  folders,
  sharedLinks,
}: {
  accessToken: string;
  teamMemberId: string;
  folders: Folder[];
  sharedLinks: FilteredSharedLink[];
}) => {
  const [foldersPermissions, foldersMetadata] = await Promise.all([
    getFoldersPermissions({
      accessToken,
      teamMemberId,
      folders,
    }),
    getFoldersMetadata({
      accessToken,
      teamMemberId,
      folders,
    }),
  ]);

  const mappedResult = folders.map((entry) => {
    if (!entry.sharing_info) {
      throw new Error('Sharing info not found');
    }

    const permissions = foldersPermissions.get(entry.id);
    const metadata = foldersMetadata.get(entry.sharing_info.shared_folder_id);

    if (sharedLinks.length > 0 && permissions) {
      permissions.anyone = sharedLinks.filter(({ id }) => {
        const isSharedFolder = id === `ns:${entry.sharing_info?.shared_folder_id}`; // if the folder is shared with anyone the id will be ns:shared_folder_id
        const isDirectEntry = id === entry.id; // if the folder is not shared with anyone, shared link id will be the folder id
        return isSharedFolder || isDirectEntry;
      });
    }

    if (metadata && permissions) {
      const formattedPermissions = formatPermissions(permissions);

      return {
        ...entry,
        metadata,
        permissions: formattedPermissions,
      };
    }

    // Permissions and metadata should have been assigned, if not throw error
    throw new Error('Permissions or metadata not found');
  });

  if (!teamMemberId) {
    throw new Error('Missing teamMemberId');
  }

  return formatFoldersToAdd({
    teamMemberId,
    folders: mappedResult,
  });
};

export type GetFoldersMetadataMembersAndMapDetails = Awaited<
  ReturnType<typeof getFoldersMetadataMembersAndMapDetails>
>;
