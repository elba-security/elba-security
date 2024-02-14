import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DropboxResponseError } from 'dropbox';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { synchronizeFoldersAndFiles } from './sync-folders-and-files';

import {
  folderAndFilesWithOutPagination,
  sharedLinks,
} from './__mocks__/folder-files-and-shared-links';
import { foldersAndFilesToAdd } from './__mocks__/folders-and-files-to-add';
import { insertOrganisations, insertTestSharedLinks } from '@/test-utils/token';
import * as crypto from '@/common/crypto';
import { NonRetriableError } from 'inngest';

const RETRY_AFTER = '300';
const organisationId = '00000000-0000-0000-0000-000000000001';
const teamMemberId = 'team-member-id-1';
const syncStartedAt = '2021-01-01T00:00:00.000Z';

const elbaOptions = {
  baseUrl: 'https://api.elba.io',
  apiKey: 'elba-api-key',
  organisationId,
  region: 'eu',
};

const setup = createInngestFunctionMock(
  synchronizeFoldersAndFiles,
  'dropbox/data_protection.folder_and_files.sync_page.requested'
);

const mocks = vi.hoisted(() => {
  return {
    fetchFoldersAndFilesMock: vi.fn(),
    fetchMetadataMembersAndMapDetailsMock: vi.fn(),
  };
});

vi.mock('@/connectors/dropbox/dbx-files.ts', () => {
  const dropbox = vi.importActual('dropbox');
  return {
    ...dropbox,
    DBXFiles: vi.fn(() => {
      return {
        fetchFoldersAndFiles: mocks.fetchFoldersAndFilesMock,
        fetchMetadataMembersAndMapDetails: mocks.fetchMetadataMembersAndMapDetailsMock,
      };
    }),
  };
});

describe('synchronizeFoldersAndFiles', async () => {
  beforeEach(async () => {
    await insertOrganisations();
    mocks.fetchFoldersAndFilesMock.mockReset();
    mocks.fetchMetadataMembersAndMapDetailsMock.mockReset();
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  test('should abort sync when organisation is not registered', async () => {
    mocks.fetchFoldersAndFilesMock.mockResolvedValue({});
    const [result, { step }] = await setup({
      organisationId: '00000000-0000-0000-0000-000000000010',
      teamMemberId: 'team-member-id',
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(mocks.fetchFoldersAndFilesMock).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    const elba = spyOnElba();
    mocks.fetchFoldersAndFilesMock.mockRejectedValue(
      new DropboxResponseError(
        429,
        {},
        {
          error_summary: 'too_many_requests/...',
          error: {
            '.tag': 'too_many_requests',
            retry_after: RETRY_AFTER,
          },
        }
      )
    );

    const [result, { step }] = setup({
      organisationId,
      isFirstSync: true,
      syncStartedAt,
      cursor: 'cursor-1',
      teamMemberId,
    });
    await expect(result).rejects.toBeInstanceOf(DropboxResponseError);

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith(elbaOptions);

    const elbaInstance = elba.mock.results[0]?.value;

    expect(step.sendEvent).toBeCalledTimes(0);
    await expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(0);
  });

  test('should list all the folders and files in the first page for the respective team member', async () => {
    const elba = spyOnElba();
    await insertTestSharedLinks(sharedLinks);

    mocks.fetchFoldersAndFilesMock.mockImplementation(() => {
      return folderAndFilesWithOutPagination;
    });

    mocks.fetchMetadataMembersAndMapDetailsMock.mockImplementation(() => {
      return foldersAndFilesToAdd;
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt,
      teamMemberId,
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith(elbaOptions);

    const elbaInstance = elba.mock.results[0]?.value;

    await expect(step.run).toBeCalledTimes(3);
    await expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
  });

  test('should list all the folders and files in the first page for the respective team member & trigger the next page scan', async () => {
    const elba = spyOnElba();
    await insertTestSharedLinks(sharedLinks);

    mocks.fetchFoldersAndFilesMock.mockImplementation(() => {
      return {
        ...folderAndFilesWithOutPagination,
        hasMore: true,
      };
    });

    mocks.fetchMetadataMembersAndMapDetailsMock.mockImplementation(() => {
      return foldersAndFilesToAdd;
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt,
      teamMemberId,
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith(elbaOptions);

    const elbaInstance = elba.mock.results[0]?.value;

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-folders-and-files', {
      name: 'dropbox/data_protection.folder_and_files.sync_page.requested',
      data: {
        organisationId,
        isFirstSync: false,
        syncStartedAt,
        teamMemberId,
        cursor: 'cursor-1',
      },
    });

    await expect(step.run).toBeCalledTimes(3);
    await expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    await expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: foldersAndFilesToAdd,
    });
  });
});
