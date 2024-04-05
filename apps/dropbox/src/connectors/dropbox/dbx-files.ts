import type { files as DbxFiles, sharing } from 'dropbox/types/dropbox_types';
import type {
  DBXFilesOptions,
  FileOrFolder,
  FileSelectedTypes,
  FolderFilePermissions,
  GeneralFolderFilePermissions,
  SharedLinks,
} from '@/connectors/types';
import { env } from '@/env';
import { formatPermissions } from '../utils/format-permissions';
import { formatFilesToAdd } from '../utils/format-file-and-folders-to-elba';
import { filterSharedLinks } from '../utils/format-shared-links';
import { chunkArray } from '../utils/helpers';
import { DBXAccess } from './dbx-access';

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
    let nextHasMore: boolean;
    let nextCursor: string | undefined;
    do {
      const {
        result: { links, has_more: hasMore, cursor },
        // eslint-disable-next-line -- Need to wait for the response
      } = await this.dbx.sharingListSharedLinks({
        path,
        cursor: nextCursor,
      });

      sharedLinks.push(...links);
      nextCursor = cursor;
      nextHasMore = hasMore;
    } while (nextHasMore);

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

  fetchFilesMetadataBatch = async (files: FileSelectedTypes[]) => {
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

        result.forEach(({ file, result: fileDetails }) => {
          if (fileDetails['.tag'] === 'access_error' || fileDetails['.tag'] === 'other') {
            return;
          }

          sharedFileMetadata.set(file, {
            name: fileDetails.name,
            preview_url: fileDetails.preview_url,
          });
        });
      })
    );

    return sharedFileMetadata;
  };

  // TODO: need to be optimized
  fetchFilesPermissions = async (files: FileSelectedTypes[]) => {
    const permissions: FolderFilePermissions = new Map();
    const concurrentLimit = 20;

    const throttledFetch = async (fileBatch: FileSelectedTypes[]) => {
      await Promise.all(
        fileBatch.map(async ({ id: fileId }) => {
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
              ? // eslint-disable-next-line -- Need to wait for the response
                await this.dbx.sharingListFileMembersContinue({ cursor: nextCursor })
              : // eslint-disable-next-line -- Need to wait for the response
                await this.dbx.sharingListFileMembers({
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
    };

    // Split files array into batches and process each batch sequentially
    for (let i = 0; i < files.length; i += concurrentLimit) {
      const fileBatch = files.slice(i, i + concurrentLimit);
      // eslint-disable-next-line -- Need to wait for the response
      await throttledFetch(fileBatch);
    }

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
          if (!shareFolderId) {
            throw new Error('Missing shared_folder_id');
          }

          const {
            result: { name, preview_url: previewUrl },
          } = await this.dbx.sharingGetFolderMetadata({
            actions: [],
            shared_folder_id: shareFolderId,
          });

          return {
            folder_id: folderId,
            name,
            preview_url: previewUrl,
          };
        }
      )
    );

    for (const { folder_id: folderId, ...rest } of metadataResult) {
      sharedFolderMetadata.set(folderId, rest);
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
          if (!shareFolderId) {
            throw new Error('Missing shared_folder_id');
          }

          const folderPermissions: GeneralFolderFilePermissions = {
            users: [],
            groups: [],
            invitees: [],
          };

          let nextCursor: string | undefined;
          do {
            const response = nextCursor
              ? // eslint-disable-next-line -- Need to wait for the response
                await this.dbx.sharingListFolderMembersContinue({ cursor: nextCursor })
              : // eslint-disable-next-line -- Need to wait for the response
                await this.dbx.sharingListFolderMembers({
                  shared_folder_id: shareFolderId,
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

  // MapFolders
  fetchFoldersMetadataMembersAndMapDetails = async ({
    folders,
    sharedLinks,
  }: {
    folders: DbxFiles.FolderMetadataReference[];
    sharedLinks: SharedLinks[];
  }) => {
    const [foldersPermissions, foldersMetadata] = await Promise.all([
      this.fetchFoldersPermissions(folders),
      this.fetchFoldersMetadata(folders),
    ]);

    const mappedResult = folders.map((entry) => {
      const permissions = foldersPermissions.get(entry.id);
      const metadata = foldersMetadata.get(entry.id);

      if (sharedLinks.length > 0 && permissions) {
        permissions.anyone = sharedLinks.filter(({ id }) => id === `ns:${entry.shared_folder_id}`);
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

  // MapFiles
  fetchFilesMetadataMembersAndMapDetails = async ({
    files,
    sharedLinks,
  }: {
    files: FileSelectedTypes[];
    sharedLinks: SharedLinks[];
  }) => {
    const [filesPermissions, filesMetadata] = await Promise.all([
      this.fetchFilesPermissions(files),
      this.fetchFilesMetadataBatch(files),
    ]);

    const mappedResult = files.map((entry) => {
      const permissions = filesPermissions.get(entry.id);
      const metadata = filesMetadata.get(entry.id);

      if (sharedLinks.length > 0 && permissions) {
        permissions.anyone = sharedLinks.filter(({ id }) => id === entry.id);
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
