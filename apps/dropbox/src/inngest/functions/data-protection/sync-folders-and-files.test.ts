import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DropboxResponseError } from 'dropbox';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { insertOrganisations, insertTestSharedLinks } from '@/test-utils/token';
import * as crypto from '@/common/crypto';
import { synchronizeFoldersAndFiles } from './sync-folders-and-files';
import { sharedLinks } from './__mocks__/folder-files-and-shared-links';

const RETRY_AFTER = '300';
const organisationId = '00000000-0000-0000-0000-000000000001';
const teamMemberId = 'team-member-id-1';
const syncStartedAt = 1609459200000;

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
    fetchFilesMetadataMembersAndMapDetailsMock: vi.fn(),
    fetchFoldersMetadataMembersAndMapDetailsMock: vi.fn(),
  };
});

vi.mock('@/connectors/dropbox/dbx-files.ts', async () => {
  const dropbox = await vi.importActual('dropbox');
  return {
    ...dropbox,
    DBXFiles: vi.fn(() => {
      return {
        fetchFoldersAndFiles: mocks.fetchFoldersAndFilesMock,
        fetchFilesMetadataMembersAndMapDetails: mocks.fetchFilesMetadataMembersAndMapDetailsMock,
        fetchFoldersMetadataMembersAndMapDetails: mocks.fetchFilesMetadataMembersAndMapDetailsMock,
      };
    }),
  };
});

describe('synchronizeFoldersAndFiles', () => {
  beforeEach(async () => {
    await insertOrganisations();
    await insertTestSharedLinks(sharedLinks);
    mocks.fetchFoldersAndFilesMock.mockReset();
    mocks.fetchFilesMetadataMembersAndMapDetailsMock.mockReset();
    mocks.fetchFoldersMetadataMembersAndMapDetailsMock.mockReset();
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should abort sync when organisation is not registered', async () => {
    mocks.fetchFoldersAndFilesMock.mockResolvedValue({});
    const [result, { step }] = setup({
      organisationId: '00000000-0000-0000-0000-000000000002',
      isFirstSync: true,
      syncStartedAt,
      teamMemberId,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(mocks.fetchFoldersAndFilesMock).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
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
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should synchronize folders, files and send event to sync next page', async () => {
    const elba = spyOnElba();
    await insertTestSharedLinks(sharedLinks);

    mocks.fetchFoldersAndFilesMock.mockImplementation(() => {
      return {
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
          },
          {
            '.tag': 'file',
            id: 'id:file-id-2',
            name: 'file-2.png',
            content_hash: 'content-hash-2',
          },
        ],
        cursor: 'cursor-2',
        hasMore: true,
      };
    });

    mocks.fetchFoldersMetadataMembersAndMapDetailsMock.mockImplementation(() => {
      return [
        {
          id: 'id:folder-id-1',
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
          id: 'id:folder-id-2',
          metadata: {
            is_personal: true,
            shared_links: [],
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
          ],
          url: 'https://www.dropbox.com/folder-2',
        },
      ];
    });

    mocks.fetchFilesMetadataMembersAndMapDetailsMock.mockImplementation(() => {
      return [
        {
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
          contentHash: 'content-hash-1',
        },
        {
          id: 'id:file-id-2',
          metadata: {
            is_personal: true,
            shared_links: [],
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
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt,
      teamMemberId,
      cursor: 'cursor-1',
    });

    await expect(result).resolves.toStrictEqual({
      status: 'ongoing',
    });

    expect(step.run).toBeCalledTimes(4);
    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith(elbaOptions);

    const elbaInstance = elba.mock.results.at(0)?.value;
    expect(elbaInstance?.dataProtection.deleteObjects).not.toBeCalled();
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-folders-and-files-requested', {
      data: {
        cursor: undefined,
        isFirstSync: false,
        organisationId,
        syncStartedAt,
        teamMemberId,
      },
      name: 'dropbox/data_protection.folder_and_files.sync_page.requested',
    });
  });
});
