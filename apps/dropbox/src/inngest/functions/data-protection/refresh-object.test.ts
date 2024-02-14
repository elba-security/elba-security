import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { refreshObject } from './refresh-object';
import { foldersAndFiles, sharedLinks } from './__mocks__/folder-files-and-shared-links';
import { foldersAndFilesToAdd } from './__mocks__/folders-and-files-to-add';
import { insertOrganisations, insertTestSharedLinks } from '@/test-utils/token';
import * as crypto from '@/common/crypto';
import { NonRetriableError } from 'inngest';

const organisationId = '00000000-0000-0000-0000-000000000001';

const elbaOptions = {
  baseUrl: 'https://api.elba.io',
  apiKey: 'elba-api-key',
  organisationId,
  region: 'eu',
};

const setup = createInngestFunctionMock(
  refreshObject,
  'dropbox/data_protection.refresh_object.requested'
);

const mocks = vi.hoisted(() => {
  return {
    fetchSharedLinksByPathMock: vi.fn(),
    fetchFolderOrFileMetadataByPathMock: vi.fn(),
    fetchMetadataMembersAndMapDetailsMock: vi.fn(),
  };
});

vi.mock('@/connectors/dropbox/dbx-files', () => {
  const dropbox = vi.importActual('dropbox');
  return {
    ...dropbox,
    DBXFiles: vi.fn(() => {
      return {
        fetchSharedLinksByPath: mocks.fetchSharedLinksByPathMock,
        fetchFolderOrFileMetadataByPath: mocks.fetchFolderOrFileMetadataByPathMock,
        fetchMetadataMembersAndMapDetails: mocks.fetchMetadataMembersAndMapDetailsMock,
      };
    }),
  };
});

describe('refreshObject', async () => {
  beforeEach(async () => {
    await insertOrganisations();
    await insertTestSharedLinks(sharedLinks);
    mocks.fetchSharedLinksByPathMock.mockReset();
    mocks.fetchFolderOrFileMetadataByPathMock.mockReset();
    mocks.fetchMetadataMembersAndMapDetailsMock.mockReset();
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
  });

  beforeAll(async () => {
    vi.clearAllMocks();
  });

  test('should abort sync when organisation is not registered', async () => {
    const elba = spyOnElba();
    const [result, { step }] = await setup({
      id: 'source-object-id',
      organisationId: '00000000-0000-0000-0000-000000000010',
      metadata: {
        ownerId: 'team-member-id-1',
        isPersonal: false,
        type: 'folder',
      },
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(elba).toBeCalledTimes(0);
    expect(mocks.fetchSharedLinksByPathMock).toBeCalledTimes(0);
    expect(mocks.fetchFolderOrFileMetadataByPathMock).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should delete the object in elba if the file is not exist in the source', async () => {
    const elba = spyOnElba();
    mocks.fetchSharedLinksByPathMock.mockResolvedValueOnce([sharedLinks.at(0), sharedLinks.at(1)]);
    mocks.fetchFolderOrFileMetadataByPathMock.mockResolvedValueOnce({
      '.tag': 'folder',
      id: 'id:folder-id-1',
      name: 'folder-1',
      path_display: '/folder-1',
      shared_folder_id: 'share-folder-id-1',
    });

    const [result, { step }] = await setup({
      id: 'source-object-id',
      organisationId,
      metadata: {
        ownerId: 'team-member-id-1',
        isPersonal: false,
        type: 'folder',
      },
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith(elbaOptions);

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(step.run).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(0);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
      ids: ['source-object-id'],
    });
  });

  test('should successfully refresh the requested file or folder', async () => {
    const elba = spyOnElba();
    mocks.fetchSharedLinksByPathMock.mockResolvedValueOnce([sharedLinks.at(0), sharedLinks.at(1)]);
    mocks.fetchFolderOrFileMetadataByPathMock.mockResolvedValueOnce(foldersAndFiles.at(0));
    mocks.fetchMetadataMembersAndMapDetailsMock.mockResolvedValueOnce([foldersAndFilesToAdd.at(0)]);

    const [result, { step }] = setup({
      id: 'source-object-id',
      organisationId,
      metadata: {
        ownerId: 'team-member-id-1',
        isPersonal: false,
        type: 'folder',
      },
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith(elbaOptions);

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(step.run).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).not.toBeCalled();
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
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
  });
});
