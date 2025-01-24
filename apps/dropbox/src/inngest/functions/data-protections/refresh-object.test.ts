import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as nangoAPI from '@/common/nango';
import * as foldersAndFilesConnector from '@/connectors/dropbox/folders-and-files';
import * as foldersConnector from '@/connectors/dropbox/folders';
import * as sharedLinksConnector from '@/connectors/dropbox/shared-links';
import { env } from '@/common/env';
import { refreshObject } from './refresh-object';
import * as usersConnector from '@/connectors/dropbox/users';

const organisationId = '00000000-0000-0000-0000-000000000001';
const nangoConnectionId = 'nango-connection-id';
const region = 'us';

const setup = createInngestFunctionMock(
  refreshObject,
  'dropbox/data_protection.refresh_object.requested'
);

describe('refreshObject', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete the object in elba if the file is not exist in the source', async () => {
    const elba = spyOnElba();
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'valid-token' },
      }),
    });
    vi.spyOn(usersConnector, 'getAuthenticatedAdmin').mockResolvedValue({
      teamMemberId: 'admin-team-member-id',
    });
    vi.spyOn(usersConnector, 'getCurrentUserAccount').mockResolvedValue({
      rootNamespaceId: 'root-namespace-id',
      teamMemberId: 'team-memeber-id',
    });
    vi.spyOn(foldersAndFilesConnector, 'getFolderOrFileMetadataByPath').mockResolvedValue({
      error_summary: 'not_found',
      error: {
        '.tag': 'path',
        path: {
          '.tag': 'not_found',
        },
      },
    });

    vi.spyOn(sharedLinksConnector, 'getSharedLinksByPath');

    const [result] = setup({
      organisationId,
      id: 'source-object-id',
      metadata: {
        isPersonal: true,
        ownerId: 'team-member-id-1',
        type: 'folder',
      },
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId,
      region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;
    expect(sharedLinksConnector.getSharedLinksByPath).toBeCalledTimes(0);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(0);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
      ids: ['source-object-id'],
    });
  });

  test('should successfully refresh the requested file or folder', async () => {
    const elba = spyOnElba();
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'valid-token' },
      }),
    });

    vi.spyOn(usersConnector, 'getAuthenticatedAdmin').mockResolvedValue({
      teamMemberId: 'admin-team-member-id',
    });
    vi.spyOn(usersConnector, 'getCurrentUserAccount').mockResolvedValue({
      rootNamespaceId: 'root-namespace-id',
      teamMemberId: 'team-memeber-id',
    });
    vi.spyOn(foldersAndFilesConnector, 'getFolderOrFileMetadataByPath').mockResolvedValue({
      '.tag': 'folder',
      id: 'id:folder-id-1',
      name: 'folder-1',
      path_lower: '/folder-1',
      shared_folder_id: '000001',
      sharing_info: {
        shared_folder_id: '000001',
      },
      path_display: '/folder-1',
    });

    vi.spyOn(sharedLinksConnector, 'getSharedLinksByPath').mockResolvedValue([
      {
        id: 'ns:000001',
        url: 'https://www.dropbox.com/folder-1',
        linkAccessLevel: 'viewer',
        pathLower: '/folder-1',
      },
    ]);

    vi.spyOn(foldersConnector, 'getFoldersMetadataMembersAndMapDetails').mockResolvedValue([
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
          {
            id: 'https://www.dropbox.com/folder-1',
            metadata: {
              sharedLinks: ['https://www.dropbox.com/folder-1'],
            },
            type: 'anyone',
          },
        ],
        url: 'https://www.dropbox.com/folder-1',
      },
    ]);

    const [result] = setup({
      id: 'source-object-id',
      organisationId,
      metadata: {
        ownerId: 'team-member-id-1',
        isPersonal: false,
        type: 'folder',
      },
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId,
      region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.dataProtection.deleteObjects).not.toBeCalled();
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: [
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
            {
              id: 'https://www.dropbox.com/folder-1',
              metadata: {
                sharedLinks: ['https://www.dropbox.com/folder-1'],
              },
              type: 'anyone',
            },
          ],
          url: 'https://www.dropbox.com/folder-1',
        },
      ],
    });
  });
});
