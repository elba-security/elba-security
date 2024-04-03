import type { files } from 'dropbox';
import type { SharedLinks } from '@/connectors/types';

// Folder and files
type FolderType = Pick<
  files.FolderMetadataReference,
  '.tag' | 'id' | 'name' | 'path_lower' | 'path_display' | 'shared_folder_id'
>;
type FileType = Pick<
  files.FileMetadataReference,
  | '.tag'
  | 'id'
  | 'name'
  | 'path_lower'
  | 'path_display'
  | 'client_modified'
  | 'server_modified'
  | 'content_hash'
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
    content_hash: 'content-hash-1',
  },
  {
    '.tag': 'file',
    id: 'id:file-id-2',
    name: 'file-2.png',
    path_lower: '/file-2.png',
    path_display: '/file-2.png',
    client_modified: '2021-01-01T00:00:00.000Z',
    server_modified: '2021-01-01T00:00:00.000Z',
    content_hash: 'content-hash-2',
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
