import { DataProtectionObject } from '@elba-security/sdk';

export const foldersAndFilesToAdd: DataProtectionObject[] = [
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
        metadata: {
          shared_links: ['https://www.dropbox.com/s/shared-link/file-6.pdf'],
        },
        type: 'anyone',
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
        metadata: {
          shared_links: [
            'https://www.dropbox.com/s/shared-link/edit/folder-7.pdf',
            'https://www.dropbox.com/s/shared-link/view/folder-7.pdf',
          ],
        },
        type: 'anyone',
      },
    ],
    url: 'https://www.dropbox.com/folder-7',
  },
];
