import { files as DbxFiles, team } from 'dropbox/types/dropbox_types';
import { DBXAccess } from './DBXAccess';
import { DBXFetcherOptions, FolderFilePermissions, SharedLinks } from '../types/types';
import { formatPermissions, formatSharedLinksPermission } from '../utils/format-permissions';
import { formatFilesToAdd } from '../utils/format-file-and-folders-to-elba';
import { filterSharedLinks } from '../utils/format-shared-links';

const DROPBOX_BD_USERS_BATCH_SIZE = 1000;
const DROPBOX_LIST_FILE_MEMBERS_LIMIT = 300; // UInt32(min=1, max=300)
const DROPBOX_LIST_FOLDER_MEMBERS_LIMIT = 1000;
const DROPBOX_LIST_FOLDER_BATCH_SIZE = 500;

export class DbxFetcher {
  private adminTeamMemberId?: string;
  private teamMemberId?: string;
  private pathRoot?: string;
  private dbx: DBXAccess;

  constructor({ accessToken, adminTeamMemberId, teamMemberId, pathRoot }: DBXFetcherOptions) {
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

  fetchUsers = async (cursor?: string) => {
    const {
      result: { members, cursor: nextCursor, has_more: hasMore },
    } = cursor
      ? await this.dbx.teamMembersListContinueV2({
          cursor,
        })
      : await this.dbx.teamMembersListV2({
          include_removed: false,
          limit: DROPBOX_BD_USERS_BATCH_SIZE,
        });

    if (!members.length) {
      throw new Error('No members found');
    }

    const activeTeamMembers = members.filter(({ profile: { status } }) => {
      // We only consider active, suspended members
      return ['active', 'suspended'].includes(status['.tag']);
    });

    return {
      nextCursor,
      hasMore,
      members: activeTeamMembers,
    };
  };

  fetchSharedLinks = async ({
    organisationId,
    teamMemberId,
    isPersonal,
    cursor,
  }: {
    organisationId: string;
    teamMemberId: string;
    isPersonal: boolean;
    cursor?: string;
  }) => {
    this.dbx.setHeaders({
      selectUser: this.teamMemberId,
      ...(isPersonal ? {} : { pathRoot: JSON.stringify({ '.tag': 'root', root: this.pathRoot }) }),
    });

    const {
      result: { links, has_more: hasMore, cursor: nexCursor },
    } = await this.dbx.sharingListSharedLinks({
      cursor,
    });

    const sharedLinks = filterSharedLinks({
      sharedLinks: links,
      organisationId,
      teamMemberId,
    });

    return {
      hasMore,
      links: sharedLinks,
      cursor: nexCursor,
    };
  };

  fetchFoldersAndFiles = async (cursor?: string) => {
    const isAdmin = this.adminTeamMemberId === this.teamMemberId;

    this.dbx.setHeaders({
      selectUser: this.teamMemberId,
      ...(isAdmin ? { pathRoot: JSON.stringify({ '.tag': 'root', root: this.pathRoot }) } : {}),
    });

    if (cursor) {
      return await this.dbx.filesListFolderContinue({
        cursor,
      });
    }

    return await this.dbx.filesListFolder({
      path: '',
      include_deleted: false,
      include_has_explicit_shared_members: true,
      include_media_info: true,
      include_mounted_folders: true,
      include_non_downloadable_files: true,
      recursive: true,
      limit: DROPBOX_LIST_FOLDER_BATCH_SIZE,
    });
  };

  // fetch files meta data
  fetchFilesMetadata = async (files: DbxFiles.FileMetadataReference[]) => {
    const sharedFolderMetadata = new Map<
      string,
      {
        name: string;
        preview_url: string;
      }
    >();

    const metadataResult = await Promise.all(
      files.map(async ({ id: fileId }: DbxFiles.FileMetadataReference) => {
        const {
          result: { name, preview_url },
        } = await this.dbx.sharingGetFileMetadata({
          actions: [],
          file: fileId,
        });

        return {
          file_id: fileId,
          name,
          preview_url,
        };
      })
    );

    if (!metadataResult) {
      throw new Error('No metadata found for files');
    }

    for (const { file_id, ...rest } of metadataResult) {
      sharedFolderMetadata.set(file_id, rest);
    }

    return sharedFolderMetadata;
  };

  // Fetch files permissions
  fetchFilesPermissions = async (files: DbxFiles.FileMetadataReference[]) => {
    const result = await Promise.all(
      files.map(async ({ id: fileId }: DbxFiles.FileMetadataReference) => {
        const permissions: FolderFilePermissions = {
          id: fileId,
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
                limit: DROPBOX_LIST_FILE_MEMBERS_LIMIT,
              });

          permissions.users.push(...users);
          permissions.groups.push(...groups);
          permissions.invitees.push(...invitees);
          nextCursor = cursor;
        } while (nextCursor);

        return permissions;
      })
    );

    return formatPermissions(result);
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

  // Fetch folder permissions
  fetchFoldersPermissions = async (folders: DbxFiles.FolderMetadataReference[]) => {
    const result = await Promise.all(
      folders.map(
        async ({
          id: folderId,
          shared_folder_id: shareFolderId,
        }: DbxFiles.FolderMetadataReference) => {
          const permissions: FolderFilePermissions = {
            id: folderId,
            users: [],
            groups: [],
            invitees: [],
          };

          let nextCursor: string | undefined;
          do {
            const {
              result: { users, groups, invitees, cursor },
            } = nextCursor
              ? await this.dbx.sharingListFolderMembersContinue({ cursor: nextCursor })
              : await this.dbx.sharingListFolderMembers({
                  shared_folder_id: shareFolderId!,
                  limit: DROPBOX_LIST_FOLDER_MEMBERS_LIMIT,
                });

            permissions.users.push(...users);
            permissions.groups.push(...groups);
            permissions.invitees.push(...invitees);
            nextCursor = cursor;
          } while (nextCursor);

          return permissions;
        }
      )
    );

    return formatPermissions(result);
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
        this.fetchFilesMetadata(files),
      ]);

    const filteredPermissions = new Map([...foldersPermissions, ...filesPermissions]);
    const filteredMetadata = new Map([...foldersMetadata, ...filesMetadata]);

    const mappedResult = [...folders, ...files].map((entry) => {
      const permissions = filteredPermissions.get(entry.id);
      const metadata = filteredMetadata.get(entry.id);

      const fileSharedLinks = formatSharedLinksPermission(
        sharedLinks.filter(({ pathLower }) => pathLower === entry.path_lower)
      );

      if (metadata && permissions) {
        return {
          ...entry,
          metadata,
          permissions: [...permissions, ...fileSharedLinks],
        };
      }

      // Permissions and metadata should have been assigned, if not throw error
      throw new Error('Permissions or metadata not found');
    });

    return formatFilesToAdd({
      teamMemberId: this.teamMemberId,
      files: mappedResult,
    });
  };
}
