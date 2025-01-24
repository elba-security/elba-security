import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as nangoAPIClient from '@/common/nango';
import * as usersConnector from '@/connectors/dropbox/users';
import { syncUsers } from './sync-users';

const organisationId = '00000000-0000-0000-0000-000000000001';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const syncStartedAt = Date.now();
const nextCursor = 'next-page-cursor';

const users: usersConnector.DropboxTeamMember[] = Array.from({ length: 2 }, (_, i) => ({
  profile: {
    team_member_id: `id-${i}`,
    name: { display_name: `name-${i}` },
    email: `user-${i}@foo.com`,
    root_folder_id: `root-folder-id-${i}`,
    status: { '.tag': 'active' },
    secondary_emails: [],
  },
}));

const setup = createInngestFunctionMock(syncUsers, 'dropbox/users.sync.requested');

describe('synchronize-users', () => {
  test('should continue the sync when there is a next page', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    }));
    vi.spyOn(usersConnector, 'getAuthenticatedAdmin').mockResolvedValue({
      teamMemberId: 'team-member-id',
    });

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      cursor: nextCursor,
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt,
      cursor: nextCursor,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-users', {
      name: 'dropbox/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: false,
        syncStartedAt,
        cursor: nextCursor,
        nangoConnectionId,
        region,
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    }));
    vi.spyOn(usersConnector, 'getAuthenticatedAdmin').mockResolvedValue({
      teamMemberId: 'team-member-id',
    });
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      cursor: '',
    });
    const [result, { step }] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt,
      cursor: null,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
    
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
