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

export const foldersAndFilesFirstPage: Array<FolderType | FileType> = [
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

export const folderAndFilesDbxResponseWithOutPagination = {
  result: {
    entries: foldersAndFilesFirstPage,
    cursor: 'cursor-1',
    has_more: false,
  },
};

export const folderAndFilesDbxResponseWithPagination = {
  result: {
    entries: foldersAndFilesFirstPage,
    cursor: 'cursor-2',
    has_more: true,
  },
};

// Response

export const fetchFilesAndFoldersMockResponse = {
  foldersAndFiles: [
    {
      '.tag': 'folder',
      id: 'id:folder-id-1',
      name: 'folder-1',
      path_display: '/folder-1',
      path_lower: '/folder-1',
      shared_folder_id: 'share-folder-id-1',
    },
    {
      '.tag': 'folder',
      id: 'id:folder-id-2',
      name: 'folder-2',
      path_display: '/folder-2',
      path_lower: '/folder-2',
      shared_folder_id: 'share-folder-id-2',
    },
    {
      '.tag': 'file',
      client_modified: '2021-01-01T00:00:00.000Z',
      id: 'id:file-id-1',
      name: 'file-1.pdf',
      path_display: '/file-1.pdf',
      path_lower: '/file-1.pdf',
      server_modified: '2021-01-01T00:00:00.000Z',
    },
    {
      '.tag': 'file',
      client_modified: '2021-01-01T00:00:00.000Z',
      id: 'id:file-id-2',
      name: 'file-2.png',
      path_display: '/file-2.png',
      path_lower: '/file-2.png',
      server_modified: '2021-01-01T00:00:00.000Z',
    },
    {
      '.tag': 'folder',
      id: 'id:folder-id-3',
      name: 'folder-3',
      path_display: '/folder-3',
      path_lower: '/folder-3',
      shared_folder_id: 'share-folder-id-3',
    },
  ],
  hasMore: false,
  nextCursor: 'cursor-1',
};

export const fetchFilesAndFoldersMockResponseWithPagination = {
  ...fetchFilesAndFoldersMockResponse,
  hasMore: true,
  nextCursor: 'cursor-2',
};
