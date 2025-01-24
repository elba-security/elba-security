import { createInngestFunctionMock } from '@elba-security/test-utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as nangoAPI from '@/common/nango';
import * as permissionsConnector from '@/connectors/dropbox/permissions';
import * as sharedLinksConnector from '@/connectors/dropbox/shared-links';
import { deleteObjectPermissions } from './delete-object-permissions';
import * as usersConnector from '@/connectors/dropbox/users';

const organisationId = '00000000-0000-0000-0000-000000000001';
const nangoConnectionId = 'nango-connection-id';
const region = 'us';

const setup = createInngestFunctionMock(
  deleteObjectPermissions,
  'dropbox/data_protection.delete_object_permission.requested'
);

describe('deleteObjectPermissions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test.each([
    {
      type: 'folder',
      email: 'external-user-1@alpha.com',
      objectId: 'folder-id',
    },
    {
      type: 'file',
      email: 'external-user-2@beta.com',
      objectId: 'file-id',
    },
  ])('should remove the team members from $type', async ({ type, objectId, email }) => {
    vi.spyOn(permissionsConnector, 'removePermission').mockResolvedValue(new Response());
    vi.spyOn(sharedLinksConnector, 'getSharedLinksByPath').mockResolvedValue([]);
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

    const [result] = setup({
      objectId,
      organisationId,
      metadata: {
        type: type as 'file' | 'folder',
        isPersonal: false,
        ownerId: 'owner-id',
      },
      permission: {
        id: email, // email is used as permission id
        metadata: null,
      },
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();

    if (type === 'folder') {
      expect(permissionsConnector.removePermission).toBeCalledTimes(1);
      expect(permissionsConnector.removePermission).toBeCalledWith({
        accessToken: 'valid-token',
        adminTeamMemberId: 'admin-team-member-id',
        metadata: {
          isPersonal: false,
          ownerId: 'owner-id',
          type: 'folder',
        },
        objectId: 'folder-id',
        permission: {
          id: 'external-user-1@alpha.com',
          metadata: null,
        },
      });
    } else {
      expect(permissionsConnector.removePermission).toBeCalledTimes(1);
      expect(permissionsConnector.removePermission).toBeCalledWith({
        accessToken: 'valid-token',
        adminTeamMemberId: 'admin-team-member-id',
        metadata: {
          isPersonal: false,
          ownerId: 'owner-id',
          type: 'file',
        },
        objectId: 'file-id',
        permission: {
          id: 'external-user-2@beta.com',
          metadata: null,
        },
      });
    }
  });

  test('should revoke the shared link', async () => {
    vi.spyOn(permissionsConnector, 'removePermission').mockResolvedValue(new Response());
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
    vi.spyOn(sharedLinksConnector, 'getSharedLinksByPath').mockResolvedValue([
      {
        id: 'shared-link-id',
        url: 'https://www.dropbox.com/sh/2',
        linkAccessLevel: 'viewer',
        pathLower: 'path-lower',
      },
    ]);
    const [result] = setup({
      objectId: 'object-id',
      organisationId,
      metadata: {
        type: 'folder',
        isPersonal: false,
        ownerId: 'owner-id',
      },
      permission: {
        id: 'permission-id',
        metadata: {
          sharedLinks: ['https://www.dropbox.com/sh/1', 'https://www.dropbox.com/sh/2'],
        },
      },
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();

    expect(permissionsConnector.removePermission).toBeCalledTimes(1);
    expect(permissionsConnector.removePermission).toBeCalledWith({
      accessToken: 'valid-token',
      adminTeamMemberId: 'admin-team-member-id',
      metadata: {
        isPersonal: false,
        ownerId: 'owner-id',
        type: 'folder',
      },
      objectId: 'object-id',
      permission: {
        id: 'permission-id',
        metadata: {
          sharedLinks: ['https://www.dropbox.com/sh/1', 'https://www.dropbox.com/sh/2'],
        },
      },
    });
  });

  test('should revoke the leftover shared link', async () => {
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
    vi.spyOn(permissionsConnector, 'removePermission').mockResolvedValue(new Response());
    vi.spyOn(sharedLinksConnector, 'getSharedLinksByPath').mockResolvedValue([
      {
        id: 'shared-link-id',
        url: 'https://www.dropbox.com/sh/2',
        linkAccessLevel: 'viewer',
        pathLower: 'path-lower',
      },
    ]);

    const [result, { step }] = setup({
      objectId: 'object-id',
      organisationId,
      metadata: {
        type: 'folder',
        isPersonal: false,
        ownerId: 'owner-id',
      },
      permission: {
        id: 'permission-id',
        metadata: {
          sharedLinks: ['https://www.dropbox.com/sh/1', 'https://www.dropbox.com/sh/2'],
        },
      },
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();

    expect(permissionsConnector.removePermission).toBeCalledTimes(1);
    expect(permissionsConnector.removePermission).toBeCalledWith({
      accessToken: 'valid-token',
      adminTeamMemberId: 'admin-team-member-id',
      metadata: {
        isPersonal: false,
        ownerId: 'owner-id',
        type: 'folder',
      },
      objectId: 'object-id',
      permission: {
        id: 'permission-id',
        metadata: {
          sharedLinks: ['https://www.dropbox.com/sh/1', 'https://www.dropbox.com/sh/2'],
        },
      },
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('delete-leftover-shared-links', {
      name: 'dropbox/data_protection.delete_object_permission.requested',
      data: {
        objectId: 'object-id',
        organisationId: '00000000-0000-0000-0000-000000000001',
        metadata: {
          type: 'folder',
          isPersonal: false,
          ownerId: 'owner-id',
        },
        permission: {
          id: 'permission-id',
          metadata: {
            sharedLinks: ['https://www.dropbox.com/sh/2'],
          },
        },
        nangoConnectionId,
        region,
      },
    });
  });
});
