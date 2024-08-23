import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/bitbucket/users';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { encrypt } from '@/common/crypto';
import { syncUsers } from './sync-users';

const newTokens = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
};

const encryptedTokens = {
  accessToken: await encrypt(newTokens.accessToken),
  refreshToken: await encrypt(newTokens.refreshToken),
};

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: encryptedTokens.accessToken,
  refreshToken: encryptedTokens.refreshToken,
  workspaceId: '00000000-0000-0000-0000-000000000010',
  region: 'us',
};
const syncStartedAt = Date.now();

const users: usersConnector.BitbucketUser[] = Array.from({ length: 5 }, (_, i) => ({
  user: {
    uuid: `user-id-${i}`,
    display_name: `user ${i}`,
  },
  workspace: {
    slug: `test-workspace-name-${i}`,
  },
}));

const setup = createInngestFunctionMock(syncUsers, 'bitbucket/users.sync.requested');

describe('syncUsers', () => {
  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: '',
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      page: null,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(usersConnector.getUsers).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    await db.insert(organisationsTable).values(organisation);

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: 'some page',
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: 'some after',
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users', {
      name: 'bitbucket/users.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        page: 'some page',
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    await db.insert(organisationsTable).values(organisation);

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: '',
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
