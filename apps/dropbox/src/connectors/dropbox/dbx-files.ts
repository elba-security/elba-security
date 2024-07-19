import { files as DbxFiles, sharing } from 'dropbox/types/dropbox_types';
import { DBXAccess } from './dbx-access';
import {
  DBXFilesOptions,
  FileOrFolder,
  FolderFilePermissions,
  GeneralFolderFilePermissions,
  SharedLinks,
} from '@/connectors/types';
import { formatPermissions } from '../utils/format-permissions';
import { formatFilesToAdd } from '../utils/format-file-and-folders-to-elba';
import { filterSharedLinks } from '../utils/format-shared-links';
import { env } from '@/env';
import { chunkArray } from '../utils/helpers';

export class DBXFiles {
  private adminTeamMemberId?: string;
  private teamMemberId?: string;
  private pathRoot?: string;
  private dbx: DBXAccess;

  constructor({ accessToken, adminTeamMemberId, teamMemberId, pathRoot }: DBXFilesOptions) {
    this.adminTeamMemberId = adminTeamMemberId;
    this.teamMemberId = teamMemberId;
    this.pathRoot = pathRoot;
    this.dbx = new DBXAccess({
      accessToken,
    });
    this.dbx.setHeaders({
      selectUser: this.teamMemberId,
    });
  }

  fetchSharedLinks = async ({ isPersonal, cursor }: { isPersonal: boolean; cursor?: string }) => {
    this.dbx.setHeaders({
      selectUser: this.teamMemberId,
      ...(isPersonal ? {} : { pathRoot: JSON.stringify({ '.tag': 'root', root: this.pathRoot }) }),
    });

    const {
      result: { links, has_more: hasMore, cursor: nextCursor },
    } = await this.dbx.sharingListSharedLinks({
      cursor,
    });

    const sharedLinks = filterSharedLinks(links);

    return {
      hasMore,
      links: sharedLinks,
      nextCursor,
    };
  };

  fetchSharedLinksByPath = async ({ isPersonal, path }: { path: string; isPersonal: boolean }) => {
    this.dbx.setHeaders({
      selectUser: this.teamMemberId,
      ...(isPersonal ? {} : { pathRoot: JSON.stringify({ '.tag': 'root', root: this.pathRoot }) }),
    });

    const sharedLinks: sharing.ListSharedLinksResult['links'] = [];
    let hasMore: boolean;
    let nextCursor: string | undefined;
    do {
      const {
        result: { links, has_more, cursor },
      } = await this.dbx.sharingListSharedLinks({
        path,
        cursor: nextCursor,
      });

      sharedLinks.push(...links);
      nextCursor = cursor;
      hasMore = has_more;
    } while (hasMore);

    return filterSharedLinks(sharedLinks);
  };

  fetchFoldersAndFiles = async (cursor?: string) => {
    const isAdmin = this.adminTeamMemberId === this.teamMemberId;

    this.dbx.setHeaders({
      selectUser: this.teamMemberId,
      ...(isAdmin ? { pathRoot: JSON.stringify({ '.tag': 'root', root: this.pathRoot }) } : {}),
    });

    const {
      result: { entries: foldersAndFiles, cursor: nextCursor, has_more: hasMore },
    } = cursor
      ? await this.dbx.filesListFolderContinue({
          cursor,
        })
      : await this.dbx.filesListFolder({
          path: '',
          include_deleted: false,
          include_has_explicit_shared_members: true,
          include_media_info: true,
          include_mounted_folders: true,
          include_non_downloadable_files: true,
          recursive: true,
          limit: env.DROPBOX_LIST_FOLDER_BATCH_SIZE,
        });

    return {
      foldersAndFiles: foldersAndFiles as FileOrFolder[],
      nextCursor,
      hasMore,
    };
  };

  fetchFilesMetadataBatch = async (files: DbxFiles.FileMetadataReference[]) => {
    const sharedFileMetadata = new Map<
      string,
      {
        name: string;
        preview_url: string;
      }
    >();

    const fileIds = files.map((file) => file.id);
    const fileChunks = chunkArray(fileIds, 80);

    await Promise.all(
      fileChunks.map(async (fileChunk) => {
        const { result } = await this.dbx.sharingGetFileMetadataBatch({
          files: fileChunk,
          actions: [],
        });

        result.forEach(({ file, result }) => {
          if (result['.tag'] === 'access_error' || result['.tag'] === 'other') {
            return;
          }

          sharedFileMetadata.set(file, {
            name: result.name,
            preview_url: result.preview_url,
          });
        });
      })
    );

    return sharedFileMetadata;
  };

  // Fetch files permissions
  fetchFilesPermissions = async (files: DbxFiles.FileMetadataReference[]) => {
    const permissions: FolderFilePermissions = new Map();
    await Promise.all(
      files.map(async ({ id: fileId }: DbxFiles.FileMetadataReference) => {
        const filePermissions: GeneralFolderFilePermissions = {
          users: [],
          groups: [],
          invitees: [],
        };

        let nextCursor: string | undefined;
        do {
          const {
            result: { users, groups, invitees, cursor },
          } = nextCursor
            ? await this.dbx.sharingListFileMembersContinue({ cursor: nextCursor })
            : await this.dbx.sharingListFileMembers({
                file: fileId,
                include_inherited: true,
                limit: env.DROPBOX_LIST_FILE_MEMBERS_LIMIT,
              });

          filePermissions.users.push(...users);
          filePermissions.groups.push(...groups);
          filePermissions.invitees.push(...invitees);
          nextCursor = cursor;
        } while (nextCursor);

        permissions.set(fileId, filePermissions);
      })
    );
    return permissions;
  };

  // Fetch folder metadata
  fetchFoldersMetadata = async (folders: DbxFiles.FolderMetadataReference[]) => {
    const sharedFolderMetadata = new Map<
      string,
      {
        name: string;
        preview_url: string;
      }
    >();

    const metadataResult = await Promise.all(
      folders.map(
        async ({
          id: folderId,
          shared_folder_id: shareFolderId,
        }: DbxFiles.FolderMetadataReference) => {
          const {
            result: { name, preview_url },
          } = await this.dbx.sharingGetFolderMetadata({
            actions: [],
            shared_folder_id: shareFolderId!,
          });

          return {
            folder_id: folderId,
            name,
            preview_url,
          };
        }
      )
    );

    if (!metadataResult) {
      throw new Error('No metadata found');
    }

    for (const { folder_id, ...rest } of metadataResult) {
      sharedFolderMetadata.set(folder_id, rest);
    }

    return sharedFolderMetadata;
  };

  fetchFolderOrFileMetadataByPath = async ({
    isPersonal,
    path,
  }: {
    isPersonal: boolean;
    path: string;
  }) => {
    this.dbx.setHeaders({
      selectUser: this.teamMemberId,
      ...(!isPersonal ? { pathRoot: JSON.stringify({ '.tag': 'root', root: this.pathRoot }) } : {}),
    });

    const { result } = await this.dbx.filesGetMetadata({
      path,
      include_deleted: false,
      include_has_explicit_shared_members: true,
      include_media_info: true,
    });

    return result;
  };

  // Fetch folder permissions
  fetchFoldersPermissions = async (folders: DbxFiles.FolderMetadataReference[]) => {
    const permissions: FolderFilePermissions = new Map();
    await Promise.all(
      folders.map(
        async ({
          id: folderId,
          shared_folder_id: shareFolderId,
        }: DbxFiles.FolderMetadataReference) => {
          const folderPermissions: GeneralFolderFilePermissions = {
            users: [],
            groups: [],
            invitees: [],
          };

          let nextCursor: string | undefined;
          do {
            const response = nextCursor
              ? await this.dbx.sharingListFolderMembersContinue({ cursor: nextCursor })
              : await this.dbx.sharingListFolderMembers({
                  shared_folder_id: shareFolderId!,
                  limit: env.DROPBOX_LIST_FOLDER_MEMBERS_LIMIT,
                });

            const { users, groups, invitees, cursor } = response.result;
            folderPermissions.users.push(...users);
            folderPermissions.groups.push(...groups);
            folderPermissions.invitees.push(...invitees);
            nextCursor = cursor;
          } while (nextCursor);

          permissions.set(folderId, folderPermissions);
        }
      )
    );
    return permissions;
  };

  fetchMetadataMembersAndMapDetails = async ({
    foldersAndFiles,
    sharedLinks,
  }: {
    foldersAndFiles: Array<DbxFiles.FolderMetadataReference | DbxFiles.FileMetadataReference>;
    sharedLinks: SharedLinks[];
  }) => {
    const { folders, files } = foldersAndFiles.reduce<{
      folders: DbxFiles.FolderMetadataReference[];
      files: DbxFiles.FileMetadataReference[];
    }>(
      (acc, entry) => {
        if (entry['.tag'] === 'folder' && entry.shared_folder_id) {
          acc.folders.push(entry);
          return acc;
        }

        if (entry['.tag'] === 'file') {
          acc.files.push(entry);
          return acc;
        }

        return acc;
      },
      {
        folders: [],
        files: [],
      }
    );

    const [foldersPermissions, foldersMetadata, filesPermissions, filesMetadata] =
      await Promise.all([
        this.fetchFoldersPermissions(folders),
        this.fetchFoldersMetadata(folders),
        this.fetchFilesPermissions(files),
        this.fetchFilesMetadataBatch(files),
      ]);

    const filteredPermissions = new Map([...foldersPermissions, ...filesPermissions]);
    const filteredMetadata = new Map([...foldersMetadata, ...filesMetadata]);

    const mappedResult = [...folders, ...files].map((entry) => {
      const permissions = filteredPermissions.get(entry.id);
      const metadata = filteredMetadata.get(entry.id);

      if (sharedLinks.length > 0 && permissions) {
        const sharedLinkFileId =
          entry['.tag'] === 'file' ? entry.id : `ns:${entry.shared_folder_id}`;

        permissions.anyone = sharedLinks.filter(({ id }) => id === sharedLinkFileId);
        filteredPermissions.set(entry.id, permissions!);
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

    if (!this.teamMemberId) {
      throw new Error('Missing teamMemberId');
    }

    return formatFilesToAdd({
      teamMemberId: this.teamMemberId,
      files: mappedResult,
    });
  };
}
