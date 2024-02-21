import { SharedLinks } from '@/connectors/types';
import type { files } from 'dropbox';

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
  foldersAndFiles: (FolderType | FileType)[];
  nextCursor: string;
  hasMore: boolean;
};

export const foldersAndFiles: (FolderType | FileType)[] = [
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

export const sharedLinks: (SharedLinks & {
  organisationId: string;
  teamMemberId: string;
})[] = [
  {
    id: 'shared-link-id-1',
    url: 'https://www.dropbox.com/s/1234567890',
    linkAccessLevel: 'viewer',
    organisationId: '00000000-0000-0000-0000-000000000001',
    teamMemberId: 'team-member-id-1',
    pathLower: '/folder-1',
  },
  {
    id: 'shared-link-id-2',
    url: 'https://www.dropbox.com/s/1234567890-editor',
    linkAccessLevel: 'editor',
    organisationId: '00000000-0000-0000-0000-000000000001',
    teamMemberId: 'team-member-id-1',
    pathLower: '/folder-1',
  },
  {
    id: 'shared-link-id-3',
    url: 'https://www.dropbox.com/s/1234567890',
    linkAccessLevel: 'viewer',
    organisationId: '00000000-0000-0000-0000-000000000001',
    teamMemberId: 'team-member-id-1',
    pathLower: '/folder-2',
  },
  {
    id: 'shared-link-id-4',
    url: 'https://www.dropbox.com/s/1234567890-editor',
    linkAccessLevel: 'editor',
    organisationId: '00000000-0000-0000-0000-000000000001',
    teamMemberId: 'team-member-id-1',
    pathLower: '/folder-2',
  },
  {
    id: 'shared-link-id-5',
    url: 'https://www.dropbox.com/s/1234567890',
    linkAccessLevel: 'viewer',
    organisationId: '00000000-0000-0000-0000-000000000001',
    teamMemberId: 'team-member-id-1',
    pathLower: '/file-1.pdf',
  },
  {
    id: 'shared-link-id-6',
    url: 'https://www.dropbox.com/s/1234567890',
    linkAccessLevel: 'viewer',
    organisationId: '00000000-0000-0000-0000-000000000001',
    teamMemberId: 'team-member-id-1',
    pathLower: '/file-2.png',
  },
  {
    id: 'shared-link-id-7',
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

type FoldersAndFilesMetadata = Map<
  string,
  {
    name: string;
    preview_url: string;
  }
>;

export const foldersMetadata: FoldersAndFilesMetadata = new Map(
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

export const filesMetadata: FoldersAndFilesMetadata = new Map(
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
