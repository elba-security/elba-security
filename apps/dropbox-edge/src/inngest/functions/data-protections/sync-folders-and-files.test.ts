import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest/components/NonRetriableError';
import { organisationsTable, sharedLinksTable, type Organisation } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import * as crypto from '@/common/crypto';
import * as fileAndFolderConnector from '@/connectors/dropbox/folders-and-files';
import * as filesConnector from '@/connectors/dropbox/files';
import * as foldersConnector from '@/connectors/dropbox/folders';
import { db } from '@/database/client';
import { syncFoldersAndFiles } from './sync-folders-and-files';
import {
  mockElbaObject,
  mockGetFilesMetadataMembersAndMapDetails,
  mockGetFolderAndFiles,
  mockGetFoldersMetadataMembersAndMapDetails,
  mockSharedLinks,
} from './__mocks__/sync-folder-and-files';

const syncStartedAt = Date.now();
const teamMemberId = 'team-member-id-1';

const newTokens = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
};

const organisation: Omit<Organisation, 'createdAt'> = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt(newTokens.accessToken),
  refreshToken: await encrypt(newTokens.accessToken),
  adminTeamMemberId: 'admin-team-member-id',
  rootNamespaceId: 'root-namespace-id',
  region: 'us',
};

const setup = createInngestFunctionMock(
  syncFoldersAndFiles,
  'dropbox/data_protection.folder_and_files.sync.requested'
);

describe('syncFoldersAndFiles', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
  });

  afterEach(async () => {
    await db.delete(sharedLinksTable);
    vi.clearAllMocks();
  });

  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(fileAndFolderConnector, 'getFoldersAndFiles').mockResolvedValue({
      foldersAndFiles: [],
      nextCursor: null,
    });

    const [result, { step }] = setup({
      organisationId: '00000000-0000-0000-0000-000000000002',
      isFirstSync: true,
      syncStartedAt,
      teamMemberId,
      cursor: null,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
    expect(fileAndFolderConnector.getFoldersAndFiles).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should synchronize folders, files and send event to sync next page', async () => {
    await db.insert(organisationsTable).values([organisation]);
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
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      teamMemberId,
      cursor: null,
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
        organisationId: organisation.id,
        cursor: 'next-cursor',
        isFirstSync: false,
        syncStartedAt,
        teamMemberId,
      },
      name: 'dropbox/data_protection.folder_and_files.sync.requested',
    });
  });

  test('should synchronize folders, complete the sync', async () => {
    await db.insert(organisationsTable).values([organisation]);
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
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      teamMemberId,
      cursor: null,
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
        organisationId: organisation.id,
      },
      name: 'dropbox/data_protection.folder_and_files.sync.completed',
    });
  });
});
