import { createInngestFunctionMock } from '@elba-security/test-utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest/components/NonRetriableError';
import * as crypto from '@/common/crypto';
import * as permissionsConnector from '@/connectors/dropbox/permissions';
import * as sharedLinksConnector from '@/connectors/dropbox/shared-links';
import { encrypt } from '@/common/crypto';
import { organisationsTable, type Organisation } from '@/database/schema';
import { db } from '@/database/client';
import { deleteObjectPermissions } from './delete-object-permissions';

const validToken = 'valid-token';

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
  deleteObjectPermissions,
  'dropbox/data_protection.delete_object_permission.requested'
);

describe('deleteObjectPermissions', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'decrypt').mockResolvedValue(validToken);
  });

  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(permissionsConnector, 'removePermission').mockResolvedValue(new Response());
    vi.spyOn(sharedLinksConnector, 'getSharedLinksByPath').mockResolvedValue([]);
    const [result] = setup({
      objectId: 'object-id',
      organisationId: '00000000-0000-0000-0000-000000000010',
      metadata: {
        type: 'folder',
        isPersonal: false,
        ownerId: 'owner-id',
      },
      permission: {
        id: 'permission-id',
        metadata: null,
      },
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
    expect(permissionsConnector.removePermission).toBeCalledTimes(0);
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
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(permissionsConnector, 'removePermission').mockResolvedValue(new Response());
    vi.spyOn(sharedLinksConnector, 'getSharedLinksByPath').mockResolvedValue([]);

    const [result] = setup({
      objectId,
      organisationId: organisation.id,
      metadata: {
        type: type as 'file' | 'folder',
        isPersonal: false,
        ownerId: 'owner-id',
      },
      permission: {
        id: email, // email is used as permission id
        metadata: null,
      },
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
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(permissionsConnector, 'removePermission').mockResolvedValue(new Response());

    const [result] = setup({
      objectId: 'object-id',
      organisationId: organisation.id,
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
    await db.insert(organisationsTable).values(organisation);
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
      organisationId: organisation.id,
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
      },
    });
  });
});
