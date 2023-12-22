import { expect, test, describe, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { POST as handler } from './route';
import { tokens, db } from '@/database';
import { mockRequestResponse } from '@/test-utils/mock-app-route';

import {
  foldersAndFiles,
  foldersAndFilesToAdd,
  sharedLinks,
} from '@/app/api/inngest/functions/data-protection/__mocks__/folder-files-and-shared-links';
import { DropboxResponseError } from 'dropbox';

const tokenGeneratedAt = '2023-03-13T16:19:20.818Z';
const organisationId = '00000000-0000-0000-0000-000000000001';
const accessToken = 'access-token-1';

const mocks = vi.hoisted(() => {
  return {
    fetchSharedLinksByPathMock: vi.fn(),
    fetchFolderOrFileMetadataByPathMock: vi.fn(),
    fetchMetadataMembersAndMapDetailsMock: vi.fn(),
    mockDeleteObjects: vi.fn(),
    mockUpdateObjects: vi.fn(),
  };
});

// Mock DBXFetcher class
vi.mock('@/repositories/dropbox/clients/DBXFetcher', () => {
  const dropbox = vi.importActual('dropbox');
  return {
    ...dropbox,
    DBXFetcher: vi.fn(() => {
      return {
        fetchSharedLinksByPath: mocks.fetchSharedLinksByPathMock,
        fetchFolderOrFileMetadataByPath: mocks.fetchFolderOrFileMetadataByPathMock,
        fetchMetadataMembersAndMapDetails: mocks.fetchMetadataMembersAndMapDetailsMock,
      };
    }),
  };
});

vi.mock('@elba-security/sdk', () => {
  return {
    Elba: vi.fn(() => {
      return {
        dataProtection: {
          updateObjects: mocks.mockUpdateObjects,
          deleteObjects: mocks.mockDeleteObjects,
        },
      };
    }),
  };
});

// Replace the actual Elba instance with the mock

describe('Callback dropbox', () => {
  beforeAll(async () => {
    vi.clearAllMocks();
  });

  beforeEach(async () => {
    mocks.fetchSharedLinksByPathMock.mockReset();
    mocks.fetchFolderOrFileMetadataByPathMock.mockReset();
    mocks.fetchMetadataMembersAndMapDetailsMock.mockReset();
    mocks.mockDeleteObjects.mockReset();
    mocks.mockUpdateObjects.mockReset();

    await db
      .insert(tokens)
      .values([
        {
          organisationId,
          accessToken,
          refreshToken: `refresh-token`,
          adminTeamMemberId: `team-member-id`,
          rootNamespaceId: `root-name-space-id`,
          teamName: 'test-team-name',
          expiresAt: new Date('2023-03-13T20:19:20.818Z'),
        },
      ])
      .execute();
  });

  test("should request to delete the object when the file doesn't have a path_lower", async () => {
    mocks.fetchSharedLinksByPathMock.mockResolvedValueOnce([sharedLinks.at(0), sharedLinks.at(1)]);
    mocks.fetchFolderOrFileMetadataByPathMock.mockResolvedValueOnce({
      '.tag': 'folder',
      id: 'id:folder-id-1',
      name: 'folder-1',
      path_display: '/folder-1',
      shared_folder_id: 'share-folder-id-1',
    });

    const { req } = mockRequestResponse({
      body: {
        id: 'id',
        organisationId,
        metadata: {
          userId: 'user-id',
          isPersonal: false,
          type: 'file',
        },
      },
    });

    const response = await handler(req);
    expect(mocks.mockDeleteObjects).toBeCalledTimes(1);
    expect(mocks.mockDeleteObjects).toBeCalledWith({ ids: ['id'] });

    expect(response.status).toBe(200);

    expect(await response.json()).toStrictEqual({ success: true });
  });

  test('should request to delete the object when the file is not found', async () => {
    mocks.fetchSharedLinksByPathMock.mockRejectedValue(
      new DropboxResponseError(
        409,
        {},
        {
          error_summary: 'path/not_found/.',
          error: { '.tag': 'path', path: { '.tag': 'not_found' } },
        }
      )
    );

    const { req } = mockRequestResponse({
      body: {
        id: 'id',
        organisationId,
        metadata: {
          userId: 'user-id',
          isPersonal: false,
          type: 'folder',
        },
      },
    });

    const response = await handler(req);
    expect(mocks.mockDeleteObjects).toBeCalledTimes(1);
    expect(mocks.mockDeleteObjects).toBeCalledWith({ ids: ['id'] });

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ success: true });
  });

  test('should successfully refresh the requested file or folder', async () => {
    mocks.fetchSharedLinksByPathMock.mockResolvedValueOnce([sharedLinks.at(0), sharedLinks.at(1)]);
    mocks.fetchFolderOrFileMetadataByPathMock.mockResolvedValueOnce(foldersAndFiles.at(0));
    mocks.fetchMetadataMembersAndMapDetailsMock.mockResolvedValueOnce([foldersAndFilesToAdd.at(0)]);
    const { req } = mockRequestResponse({
      body: {
        id: 'id',
        organisationId,
        metadata: {
          userId: 'user-id',
          isPersonal: false,
          type: 'folder',
        },
      },
    });
    const response = await handler(req);
    expect(mocks.mockDeleteObjects).toBeCalledTimes(0);
    expect(mocks.mockUpdateObjects).toBeCalledTimes(1);
    expect(mocks.mockUpdateObjects).toBeCalledWith({
      objects: [
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
      ],
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ success: true });
  });
});
