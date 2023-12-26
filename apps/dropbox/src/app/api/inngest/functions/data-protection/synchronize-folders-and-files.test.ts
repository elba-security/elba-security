import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { RetryAfterError } from 'inngest';
import { insertTestSharedLinks } from '@/common/__mocks__/token';
import { DropboxResponseError } from 'dropbox';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { synchronizeFoldersAndFiles } from './synchronize-folders-and-files';
import { DBXFetcher } from '@/repositories/dropbox/clients/DBXFetcher';

import {
  filesPermissions,
  filesMetadata,
  folderAndFilesWithOutPagination,
  sharedLinks,
  folderPermissions,
  foldersMetadata,
  foldersAndFilesToAdd,
} from './__mocks__/folder-files-and-ashred-links';

const organisationId = '00000000-0000-0000-0000-000000000001';

const setup = createInngestFunctionMock(
  synchronizeFoldersAndFiles,
  'data-protection/synchronize-folders-and-files'
);

const mocks = vi.hoisted(() => {
  return {
    fetchFoldersAndFilesMock: vi.fn(),
    fetchMetadataMembersAndMapDetailsMock: vi.fn(),
  };
});

// Mock DBXFetcher class
vi.mock('@/repositories/dropbox/clients/DBXFetcher', () => {
  const dropbox = vi.importActual('dropbox');
  return {
    ...dropbox,
    DBXFetcher: vi.fn(() => {
      return {
        fetchFoldersAndFiles: mocks.fetchFoldersAndFilesMock,
        fetchMetadataMembersAndMapDetails: mocks.fetchMetadataMembersAndMapDetailsMock,
      };
    }),
  };
});

describe('run-user-sync-jobs', async () => {
  beforeEach(async () => {
    mocks.fetchFoldersAndFilesMock.mockReset();
    mocks.fetchMetadataMembersAndMapDetailsMock.mockReset();
  });

  beforeAll(async () => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    mocks.fetchFoldersAndFilesMock.mockRejectedValue(
      new DropboxResponseError(
        429,
        {
          'Retry-After': '5',
        },
        {
          error_summary: 'too_many_requests/...',
          error: {
            '.tag': 'too_many_requests',
          },
        }
      )
    );

    const [result, { step }] = setup({
      organisationId,
      accessToken: 'access-token-1',
      isFirstScan: true,
      pathRoot: 1000,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
      cursor: 'cursor-1',
    });

    await expect(result).rejects.toStrictEqual(
      new RetryAfterError('Dropbox rate limit reached', Number(5 * 1000))
    );
  });

  test.only('should list all the folder and file in the first page for the respective team member', async () => {
    await insertTestSharedLinks(sharedLinks);

    mocks.fetchFoldersAndFilesMock.mockImplementation(() => {
      return folderAndFilesWithOutPagination;
    });

    mocks.fetchMetadataMembersAndMapDetailsMock.mockImplementation(() => {
      return foldersAndFilesToAdd;
    });

    const [result, { step }] = setup({
      organisationId,
      accessToken: 'access-token-1',
      isFirstScan: false,
      pathRoot: 1000,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
      adminTeamMemberId: 'admin-team-member-id-1',
    });

    expect(await result).toStrictEqual({
      success: true,
    });
  });
});
