import { type GetFilesMetadataMembersAndMapDetails } from '@/connectors/dropbox/files';
import { type GetFoldersMetadataMembersAndMapDetails } from '@/connectors/dropbox/folders';
import { type FolderAndFile } from '@/connectors/dropbox/folders-and-files';

export const mockSharedLinks = [
  {
    id: 'id:folder-id-1',
    url: 'https://www.dropbox.com/shared-link-1',
    linkAccessLevel: 'viewer',
    pathLower: 'personal/path-lower-1',
    organisationId: '00000000-0000-0000-0000-000000000001',
    teamMemberId: 'team-member-id-1',
  },
  {
    id: 'id:folder-id-1',
    url: 'https://www.dropbox.com/shared-link-2',
    linkAccessLevel: 'viewer',
    pathLower: 'team/path-lower-2',
    organisationId: '00000000-0000-0000-0000-000000000001',
    teamMemberId: 'team-member-id-1',
  },
  {
    id: 'id:file-id-2',
    url: 'https://www.dropbox.com/shared-link-3',
    linkAccessLevel: 'viewer',
    pathLower: 'team/path-lower-2',
    organisationId: '00000000-0000-0000-0000-000000000001',
    teamMemberId: 'team-member-id-1',
  },
];

export const mockGetFolderAndFiles: {
  foldersAndFiles: FolderAndFile[];
  nextCursor: string | null;
} = {
  foldersAndFiles: [
    {
      '.tag': 'folder',
      id: 'id:folder-id-1',
      name: 'folder-1',
      shared_folder_id: 'share-folder-id-1',
    },
    {
      '.tag': 'folder',
      id: 'id:folder-id-2',
      name: 'folder-2',
      shared_folder_id: 'share-folder-id-2',
    },
    {
      '.tag': 'file',
      id: 'id:file-id-1',
      name: 'file-1.pdf',
      content_hash: 'content-hash-1',
      server_modified: '2021-09-01T00:00:00Z',
    },
    {
      '.tag': 'file',
      id: 'id:file-id-2',
      name: 'file-2.png',
      content_hash: 'content-hash-2',
      server_modified: '2021-09-01T00:00:00Z',
    },
  ],
  nextCursor: 'next-cursor',
};

export const mockGetFilesMetadataMembersAndMapDetails: GetFilesMetadataMembersAndMapDetails = [
  {
    id: 'id:file-id-1',
    metadata: {
      isPersonal: true,
      ownerId: 'dbmid:team-member-id-1',
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
    contentHash: 'content-hash-1',
  },
  {
    id: 'id:file-id-2',
    metadata: {
      isPersonal: true,
      ownerId: 'dbmid:team-member-id-1',
      type: 'file',
    },
    name: 'file-2.pdf',
    ownerId: 'dbmid:team-member-id-1',
    permissions: [
      {
        email: 'team-member-email-1@foo.com',
        id: 'team-member-email-1@foo.com',
        type: 'user',
      },
    ],
    url: 'https://www.dropbox.com/file-2.pdf',
    contentHash: 'content-hash-1',
  },
];

export const mockGetFoldersMetadataMembersAndMapDetails: GetFoldersMetadataMembersAndMapDetails = [
  {
    id: 'id:folder-id-1',
    metadata: {
      isPersonal: true,
      ownerId: 'dbmid:team-member-id-1',
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
    id: 'id:folder-id-2',
    metadata: {
      isPersonal: true,
      ownerId: 'dbmid:team-member-id-1',
      type: 'folder',
    },
    name: 'folder-2',
    ownerId: 'dbmid:team-member-id-1',
    permissions: [
      {
        email: 'team-member-email-1@foo.com',
        id: 'team-member-email-1@foo.com',
        type: 'user',
      },
      {
        type: 'anyone',
        id: 'https://www.dropbox.com/shared-link-1::https://www.dropbox.com/shared-link-2',
        metadata: {
          sharedLinks: [
            'https://www.dropbox.com/shared-link-1',
            'https://www.dropbox.com/shared-link-2',
          ],
        },
      },
    ],
    url: 'https://www.dropbox.com/folder-2',
  },
];

export const mockElbaObject = [
  {
    id: 'id:folder-id-1',
    metadata: {
      isPersonal: true,
      ownerId: 'dbmid:team-member-id-1',
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
    id: 'id:folder-id-2',
    metadata: {
      isPersonal: true,
      ownerId: 'dbmid:team-member-id-1',
      type: 'folder',
    },
    name: 'folder-2',
    ownerId: 'dbmid:team-member-id-1',
    permissions: [
      {
        email: 'team-member-email-1@foo.com',
        id: 'team-member-email-1@foo.com',
        type: 'user',
      },
      {
        id: 'https://www.dropbox.com/shared-link-1::https://www.dropbox.com/shared-link-2',
        metadata: {
          sharedLinks: [
            'https://www.dropbox.com/shared-link-1',
            'https://www.dropbox.com/shared-link-2',
          ],
        },
        type: 'anyone',
      },
    ],
    url: 'https://www.dropbox.com/folder-2',
  },
  {
    contentHash: 'content-hash-1',
    id: 'id:file-id-1',
    metadata: {
      isPersonal: true,
      ownerId: 'dbmid:team-member-id-1',
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
    contentHash: 'content-hash-1',
    id: 'id:file-id-2',
    metadata: {
      isPersonal: true,
      ownerId: 'dbmid:team-member-id-1',
      type: 'file',
    },
    name: 'file-2.pdf',
    ownerId: 'dbmid:team-member-id-1',
    permissions: [
      {
        email: 'team-member-email-1@foo.com',
        id: 'team-member-email-1@foo.com',
        type: 'user',
      },
    ],
    url: 'https://www.dropbox.com/file-2.pdf',
  },
];
