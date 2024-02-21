import { createInngestFunctionMock } from '@elba-security/test-utils';
import { DropboxResponseError } from 'dropbox';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { deleteObjectPermissions } from './delete-object-permissions';
import { insertOrganisations } from '@/test-utils/token';
import * as crypto from '@/common/crypto';
import { NonRetriableError } from 'inngest';

const RETRY_AFTER = '300';
const organisationId = '00000000-0000-0000-0000-000000000001';

const setup = createInngestFunctionMock(
  deleteObjectPermissions,
  'dropbox/data_protection.delete_object_permission.requested'
);

const mocks = vi.hoisted(() => {
  return {
    sharingRemoveFolderMemberMock: vi.fn(),
    sharingRemoveFileMember2Mock: vi.fn(),
    sharingRevokeSharedLinkMock: vi.fn(),
  };
});

vi.mock('@/connectors/dropbox/dbx-access.ts', () => {
  const actual = vi.importActual('dropbox');
  return {
    ...actual,
    DBXAccess: vi.fn(() => {
      return {
        setHeaders: vi.fn(),
        sharingRemoveFolderMember: mocks.sharingRemoveFolderMemberMock,
        sharingRemoveFileMember2: mocks.sharingRemoveFileMember2Mock,
        sharingRevokeSharedLink: mocks.sharingRevokeSharedLinkMock,
      };
    }),
  };
});

describe('deleteObjectPermissions', () => {
  beforeEach(async () => {
    await insertOrganisations();
    mocks.sharingRemoveFolderMemberMock.mockReset();
    mocks.sharingRemoveFileMember2Mock.mockReset();
    mocks.sharingRevokeSharedLinkMock.mockReset();
    vi.clearAllMocks();
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
  });

  test('should abort sync when organisation is not registered', async () => {
    const [result] = setup({
      id: 'object-id',
      organisationId: '00000000-0000-0000-0000-000000000010',
      metadata: {
        type: 'folder',
        isPersonal: false,
        ownerId: 'owner-id',
      },
      permission: {
        id: 'permission-id',
        metadata: {},
      },
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(mocks.sharingRemoveFolderMemberMock).toBeCalledTimes(0);
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    mocks.sharingRemoveFolderMemberMock.mockRejectedValue(
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

    const [result] = setup({
      id: 'object-id',
      organisationId,
      metadata: {
        type: 'folder',
        isPersonal: false,
        ownerId: 'owner-id',
      },
      permission: {
        id: 'permission-id',
        metadata: {},
      },
    });

    await expect(result).rejects.toBeInstanceOf(DropboxResponseError);
    expect(mocks.sharingRemoveFolderMemberMock).toBeCalledTimes(1);
  });

  test.each([
    {
      type: 'folder',
      expected: {
        leave_a_copy: false,
        shared_folder_id: 'folder-id',
        member: {
          '.tag': 'email',
          email: 'folder-permission-id',
        },
      },
    },
    {
      type: 'file',
      expected: {
        file: 'file-id',
        member: {
          '.tag': 'email',
          email: 'file-permission-id',
        },
      },
    },
  ])('should remove the team members from $type', async ({ type, expected }) => {
    mocks.sharingRemoveFolderMemberMock.mockImplementation(() => {
      return {
        success: true,
      };
    });

    const [result] = setup({
      id: type === 'folder' ? expected.shared_folder_id : expected.file,
      organisationId,
      metadata: {
        type: type as 'file' | 'folder',
        isPersonal: false,
        ownerId: 'owner-id',
      },
      permission: {
        id: expected.member.email,
        metadata: {},
      },
    });

    await expect(result).resolves.toBeUndefined();

    if (type === 'folder') {
      expect(mocks.sharingRemoveFolderMemberMock).toBeCalledTimes(1);
      expect(mocks.sharingRemoveFolderMemberMock).toBeCalledWith(expected);
    } else {
      expect(mocks.sharingRemoveFileMember2Mock).toBeCalledTimes(1);
      expect(mocks.sharingRemoveFileMember2Mock).toBeCalledWith(expected);
    }
  });

  test('should revoke the shared link', async () => {
    mocks.sharingRevokeSharedLinkMock.mockImplementation(() => {
      return {
        success: true,
      };
    });

    const [result] = setup({
      id: 'object-id',
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
    });

    await expect(result).resolves.toBeUndefined();

    expect(mocks.sharingRemoveFolderMemberMock).toBeCalledTimes(0);
    expect(mocks.sharingRemoveFileMember2Mock).toBeCalledTimes(0);
    expect(mocks.sharingRevokeSharedLinkMock).toBeCalledTimes(2);
  });
});
