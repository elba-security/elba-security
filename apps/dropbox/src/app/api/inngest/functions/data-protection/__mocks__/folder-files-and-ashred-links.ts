import { SharedLinks } from '@/repositories/dropbox/types/types';
import { files } from 'dropbox';

// Folder and files
type FolderType = Pick<
  files.FolderMetadataReference,
  '.tag' | 'id' | 'name' | 'path_lower' | 'path_display' | 'shared_folder_id'
>;
type FileType = Pick<
  files.FileMetadataReference,
  '.tag' | 'id' | 'name' | 'path_lower' | 'path_display' | 'client_modified' | 'server_modified'
>;

type FoldersAndFiles = {
  foldersAndFiles: Array<FolderType | FileType>;
  nextCursor: string;
  hasMore: boolean;
};

export const foldersAndFiles: Array<FolderType | FileType> = [
  {
    '.tag': 'folder',
    id: 'id:folder-id-1',
    name: 'folder-1',
    path_lower: '/folder-1',
    path_display: '/folder-1',
    shared_folder_id: 'share-folder-id-1',
  },
  {
    '.tag': 'folder',
    id: 'id:folder-id-2',
    name: 'folder-2',
    path_lower: '/folder-2',
    path_display: '/folder-2',
    shared_folder_id: 'share-folder-id-2',
  },
  {
    '.tag': 'file',
    id: 'id:file-id-1',
    name: 'file-1.pdf',
    path_lower: '/file-1.pdf',
    path_display: '/file-1.pdf',
    client_modified: '2021-01-01T00:00:00.000Z',
    server_modified: '2021-01-01T00:00:00.000Z',
  },
  {
    '.tag': 'file',
    id: 'id:file-id-2',
    name: 'file-2.png',
    path_lower: '/file-2.png',
    path_display: '/file-2.png',
    client_modified: '2021-01-01T00:00:00.000Z',
    server_modified: '2021-01-01T00:00:00.000Z',
  },
  {
    '.tag': 'folder',
    id: 'id:folder-id-3',
    name: 'folder-3',
    path_lower: '/folder-3',
    path_display: '/folder-3',
    shared_folder_id: 'share-folder-id-3',
  },
];

export const folderAndFilesWithOutPagination: FoldersAndFiles = {
  foldersAndFiles,
  nextCursor: 'cursor-1',
  hasMore: false,
};

// Shared links

export const sharedLinks: Array<
  SharedLinks & {
    organisationId: string;
    teamMemberId: string;
  }
> = [
  {
    url: 'https://www.dropbox.com/s/1234567890',
    linkAccessLevel: 'viewer',
    organisationId: '00000000-0000-0000-0000-000000000001',
    teamMemberId: 'team-member-id-1',
    pathLower: '/folder-1',
  },
  {
    url: 'https://www.dropbox.com/s/1234567890-editor',
    linkAccessLevel: 'editor',
    organisationId: '00000000-0000-0000-0000-000000000001',
    teamMemberId: 'team-member-id-1',
    pathLower: '/folder-1',
  },
  {
    url: 'https://www.dropbox.com/s/1234567890',
    linkAccessLevel: 'viewer',
    organisationId: '00000000-0000-0000-0000-000000000001',
    teamMemberId: 'team-member-id-1',
    pathLower: '/folder-2',
  },
  {
    url: 'https://www.dropbox.com/s/1234567890-editor',
    linkAccessLevel: 'editor',
    organisationId: '00000000-0000-0000-0000-000000000001',
    teamMemberId: 'team-member-id-1',
    pathLower: '/folder-2',
  },
  {
    url: 'https://www.dropbox.com/s/1234567890',
    linkAccessLevel: 'viewer',
    organisationId: '00000000-0000-0000-0000-000000000001',
    teamMemberId: 'team-member-id-1',
    pathLower: '/file-1.pdf',
  },
  {
    url: 'https://www.dropbox.com/s/1234567890',
    linkAccessLevel: 'viewer',
    organisationId: '00000000-0000-0000-0000-000000000001',
    teamMemberId: 'team-member-id-1',
    pathLower: '/file-2.png',
  },
  {
    url: 'https://www.dropbox.com/s/1234567890',
    linkAccessLevel: 'viewer',
    organisationId: '00000000-0000-0000-0000-000000000001',
    teamMemberId: 'team-member-id-1',
    pathLower: '/folder-3',
  },
];

// Permissions

type FilesAndFolderPermissions = Map<
  string,
  {
    id: string;
    email: string;
    domain: string;
    team_member_id: string | null;
    type: string;
    role: string;
    is_inherited: boolean;
  }[]
>;

export const folderPermissions: FilesAndFolderPermissions = new Map(
  Object.entries({
    'id:folder-id-1': [
      {
        id: 'email-id-1@foo.com',
        email: 'email-id-1@foo.com',
        domain: 'foo.com',
        team_member_id: 'team-member-id-1',
        type: 'user',
        role: 'editor',
        is_inherited: false,
      },
      {
        id: 'email-1d-2@foo.com',
        email: 'email-1d-2@foo.com',
        domain: 'foo.com',
        team_member_id: 'team-member-id-2',
        type: 'user',
        role: 'viewer',
        is_inherited: false,
      },
    ],
    'id:folder-id-2': [
      {
        id: 'email-id-3@bar.com',
        email: 'email-id-3@bar.com',
        domain: 'bar.com',
        team_member_id: 'team-member-id-3',
        type: 'user',
        role: 'owner',
        is_inherited: false,
      },
    ],
    'id:folder-id-3': [
      {
        id: 'email-id-3@bar.com',
        email: 'email-id-3@bar.com',
        domain: 'bar.com',
        team_member_id: 'team-member-id-3',
        type: 'user',
        role: 'owner',
        is_inherited: false,
      },
    ],
  })
);

export const filesPermissions: FilesAndFolderPermissions = new Map(
  Object.entries({
    'id:file-id-1': [
      {
        id: 'external-email-id@external.com',
        email: 'external-email-id@external.com',
        domain: 'external.com',
        team_member_id: null,
        type: 'user',
        role: 'viewer',
        is_inherited: false,
      },
    ],
    'id:file-id-2': [
      {
        id: 'external-email-id-2@external.com',
        email: 'external-email-id-2@external.com',
        domain: 'external.com',
        team_member_id: null,
        type: 'user',
        role: 'viewer',
        is_inherited: false,
      },
      {
        id: 'email-id-3@bar.com',
        email: 'email-id-3@bar.com',
        domain: 'bar.com',
        team_member_id: 'team-member-id-3',
        type: 'user',
        role: 'owner',
        is_inherited: false,
      },
    ],
  })
);

// Folders and files metadata

type foldersAndFilesMetadata = Map<
  string,
  {
    name: string;
    preview_url: string;
  }
>;

export const foldersMetadata: foldersAndFilesMetadata = new Map(
  Object.entries({
    'id:folder-id-1': {
      name: 'folder-1',
      preview_url: 'https://www.dropbox.com/s/folder-preview-url-1',
    },
    'id:folder-id-2': {
      name: 'folder-2',
      preview_url: 'https://www.dropbox.com/s/folder-preview-url-2',
    },
    'id:folder-id-3': {
      name: 'folder-3',
      preview_url: 'https://www.dropbox.com/s/folder-preview-url-3',
    },
  })
);

export const filesMetadata: foldersAndFilesMetadata = new Map(
  Object.entries({
    'id:file-id-1': {
      name: 'file-1.pdf',
      preview_url: 'https://www.dropbox.com/s/file-preview-url-1',
    },
    'id:file-id-2': {
      name: 'file-2.png',
      preview_url: 'https://www.dropbox.com/s/file-preview-url-2',
    },
  })
);

//

export const foldersAndFilesToAdd = [
  {
    id: '000001',
    metadata: {
      is_personal: true,
      shared_links: [],
      type: 'folder',
    },
    name: 'folder-1',
    ownerId: 'dbmid:team-member-id-1',
    permissions: [
      {
        email: 'team-member-email-1@foo.com',
        id: 'team-member-email-1@foo.com',
        type: 'user',
      },
    ],
    url: 'https://www.dropbox.com/folder-1',
  },
  {
    contentHash: 'content-hash-1',
    id: 'id:file-id-1',
    metadata: {
      is_personal: true,
      shared_links: [],
      type: 'file',
    },
    name: 'file-1.pdf',
    ownerId: 'dbmid:team-member-id-1',
    permissions: [
      {
        email: 'team-member-email-1@foo.com',
        id: 'team-member-email-1@foo.com',
        type: 'user',
      },
    ],
    url: 'https://www.dropbox.com/file-1.pdf',
  },
  {
    contentHash: 'content-cache-2',
    id: 'id:file-id-2',
    metadata: {
      is_personal: true,
      shared_links: [],
      type: 'file',
    },
    name: 'file-2.png',
    ownerId: 'dbmid:team-member-id-1',
    permissions: [
      {
        email: 'team-member-email-1@foo.com',
        id: 'team-member-email-1@foo.com',
        type: 'user',
      },
    ],
    url: 'https://www.dropbox.com/file-2.png',
  },
  {
    contentHash: 'content-cache-3',
    id: 'id:file-id-3',
    metadata: {
      is_personal: true,
      shared_links: [],
      type: 'file',
    },
    name: 'file-2.zip',
    ownerId: 'dbmid:team-member-id-1',
    permissions: [
      {
        email: 'team-member-email-1@foo.com',
        id: 'team-member-email-1@foo.com',
        type: 'user',
      },
    ],
    url: 'https://www.dropbox.com/file-2.zip',
  },
  {
    contentHash: 'content-cache-4',
    id: 'id:id:file-id-4',
    metadata: {
      is_personal: true,
      shared_links: [],
      type: 'file',
    },
    name: 'file-4.zip',
    ownerId: 'dbmid:team-member-id-1',
    permissions: [
      {
        email: 'team-member-email-1@foo.com',
        id: 'team-member-email-1@foo.com',
        type: 'user',
      },
    ],
    url: 'https://www.dropbox.com/file-4.zip',
  },
  {
    contentHash: 'content-cache-5',
    id: 'id::file-id-5',
    metadata: {
      is_personal: true,
      shared_links: [],
      type: 'file',
    },
    name: 'file-5.pptx',
    ownerId: 'dbmid:team-member-id-1',
    permissions: [
      {
        email: 'team-member-email-2@bar.com',
        id: 'team-member-email-2@bar.com',
        type: 'user',
      },
      {
        email: 'team-member-email-1@foo.com',
        id: 'team-member-email-1@foo.com',
        type: 'user',
      },
    ],
    url: 'https://www.dropbox.com/file-5.pptx',
  },
  {
    contentHash: 'content-cache-6',
    id: 'id:file-id-6',
    metadata: {
      is_personal: false,

      type: 'file',
    },
    name: 'file-6.jpg',
    ownerId: 'dbmid:team-member-id-1',
    permissions: [
      {
        email: 'team-member-email-2@bar.com',
        id: 'team-member-email-2@bar.com',
        type: 'user',
      },
      {
        id: 'https://www.dropbox.com/s/shared-link/file-6.jpg',
        type: 'anyone',
        metadata: {
          shared_links: ['https://www.dropbox.com/s/shared-link/file-6.pdf'],
        },
      },
    ],
    url: 'https://www.dropbox.com/file-6.pdf',
  },
  {
    id: '0000002',
    metadata: {
      is_personal: false,
      type: 'folder',
    },
    name: 'folder-7',
    ownerId: 'dbmid:team-member-id-3',
    permissions: [
      {
        id: 'https://www.dropbox.com/s/shared-link/folder-7.pdf',
        type: 'anyone',
        metadata: {
          shared_links: [
            'https://www.dropbox.com/s/shared-link/edit/folder-7.pdf',
            'https://www.dropbox.com/s/shared-link/view/folder-7.pdf',
          ],
        },
      },
    ],
    url: 'https://www.dropbox.com/folder-7',
  },
];
