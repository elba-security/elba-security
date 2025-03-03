import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { sharedLinksTable } from '@/database/schema';
import * as nangoAPI from '@/common/nango';
import * as fileAndFolderConnector from '@/connectors/dropbox/folders-and-files';
import * as filesConnector from '@/connectors/dropbox/files';
import * as foldersConnector from '@/connectors/dropbox/folders';
import { db } from '@/database/client';
import * as usersConnector from '@/connectors/dropbox/users';
import { syncFoldersAndFiles } from './sync-folders-and-files';
import {
  mockElbaObject,
  mockGetFilesMetadataMembersAndMapDetails,
  mockGetFolderAndFiles,
  mockGetFoldersMetadataMembersAndMapDetails,
  mockSharedLinks,
} from './__mocks__/sync-folder-and-files';

const organisationId = '00000000-0000-0000-0000-000000000001';
const nangoConnectionId = 'nango-connection-id';
const region = 'us';

const syncStartedAt = Date.now();
const teamMemberId = 'team-member-id-1';

const setup = createInngestFunctionMock(
  syncFoldersAndFiles,
  'dropbox/data_protection.folder_and_files.sync.requested'
);

describe('syncFoldersAndFiles', () => {
  afterEach(async () => {
    await db.delete(sharedLinksTable);
    vi.clearAllMocks();
  });

  test('should synchronize folders, files and send event to sync next page', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });
    vi.spyOn(usersConnector, 'getAuthenticatedAdmin').mockResolvedValue({
      teamMemberId: 'admin-team-member-id',
    });

    vi.spyOn(usersConnector, 'getCurrentUserAccount').mockResolvedValue({
      rootNamespaceId: 'root-namespace-id',
      teamMemberId: 'admin-team-member-id',
    });

    await db.insert(sharedLinksTable).values(mockSharedLinks);

    const elba = spyOnElba();
    vi.spyOn(fileAndFolderConnector, 'getFoldersAndFiles').mockResolvedValue(mockGetFolderAndFiles);

    vi.spyOn(filesConnector, 'getFilesMetadataMembersAndMapDetails').mockResolvedValue(
      mockGetFilesMetadataMembersAndMapDetails
    );

    vi.spyOn(foldersConnector, 'getFoldersMetadataMembersAndMapDetails').mockResolvedValue(
      mockGetFoldersMetadataMembersAndMapDetails
    );

    const [result, { step }] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt,
      teamMemberId,
      cursor: null,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toStrictEqual({
      status: 'ongoing',
    });

    expect(step.run).toBeCalledTimes(4);
    expect(elba).toBeCalledTimes(1);

    const elbaInstance = elba.mock.results.at(0)?.value;
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: mockElbaObject,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-folders-and-files-requested', {
      data: {
        organisationId,
        cursor: 'next-cursor',
        isFirstSync: false,
        syncStartedAt,
        teamMemberId,
        nangoConnectionId,
        region,
      },
      name: 'dropbox/data_protection.folder_and_files.sync.requested',
    });
  });

  test('should synchronize folders, complete the sync', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });

    await db.insert(sharedLinksTable).values(mockSharedLinks);

    const elba = spyOnElba();
    vi.spyOn(fileAndFolderConnector, 'getFoldersAndFiles').mockResolvedValue({
      ...mockGetFolderAndFiles,
      nextCursor: null,
    });

    vi.spyOn(filesConnector, 'getFilesMetadataMembersAndMapDetails').mockResolvedValue(
      mockGetFilesMetadataMembersAndMapDetails
    );

    vi.spyOn(foldersConnector, 'getFoldersMetadataMembersAndMapDetails').mockResolvedValue(
      mockGetFoldersMetadataMembersAndMapDetails
    );

    const [result, { step }] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt,
      teamMemberId,
      cursor: null,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();

    expect(step.run).toBeCalledTimes(4);
    expect(elba).toBeCalledTimes(1);

    const elbaInstance = elba.mock.results.at(0)?.value;
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: mockElbaObject,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(`sync-folder-and-files-sync-${teamMemberId}`, {
      data: {
        teamMemberId,
        organisationId,
      },
      name: 'dropbox/data_protection.folder_and_files.sync.completed',
    });
  });
});
