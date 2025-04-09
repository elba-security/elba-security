import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/openai/users';
import * as nangoAPIClient from '@/common/nango';
import type { OpenAiUser } from '@/connectors/openai/users';
import { syncUsers } from './sync-users';

const organisationId = '00000000-0000-0000-0000-000000000001';
const organizationId = 'test-id';
const userId = 'test-user-id';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const apiKey = 'test-api-key';

export const users: OpenAiUser[] = Array.from({ length: 10 }, (_, i) => ({
  role: 'admin',
  object: 'organization.user',
  id: `userId-${i}`,
  name: `username-${i}`,
  email: `username-${i}@foo.bar`,
}));

const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(syncUsers, 'openai/users.sync.requested');

describe('sync-users', () => {
  test('should sync the users when the organization is registered', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { apiKey },
      }),
    }));

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: null,
    });

    vi.spyOn(usersConnector, 'getTokenOwnerInfo').mockResolvedValue({
      organization: { role: 'owner', id: organizationId, personal: false },
      userId,
    });

    const [result, { step }] = setup({
      organisationId,
      region,
      nangoConnectionId,
      isFirstSync: false,
      syncStartedAt,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.sendEvent).toBeCalledTimes(0);
    expect(usersConnector.getUsers).toBeCalledTimes(1);
    expect(usersConnector.getUsers).toBeCalledWith({
      apiKey,
      page: null,
    });
  });

  test('should continue the sync when there is a next page', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { apiKey },
      }),
    }));

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: 'some after',
    });

    vi.spyOn(usersConnector, 'getTokenOwnerInfo').mockResolvedValue({
      organization: { role: 'owner', id: organizationId, personal: false },
      userId,
    });

    const [result, { step }] = setup({
      organisationId,
      region,
      nangoConnectionId,
      isFirstSync: false,
      syncStartedAt,
      page: 'some after',
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users', {
      name: 'openai/users.sync.requested',
      data: {
        organisationId,
        region,
        nangoConnectionId,
        isFirstSync: false,
        syncStartedAt,
        page: 'some after',
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { apiKey },
      }),
    }));

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: null,
    });

    vi.spyOn(usersConnector, 'getTokenOwnerInfo').mockResolvedValue({
      organization: { role: 'owner', id: organizationId, personal: false },
      userId,
    });

    const [result, { step }] = setup({
      region,
      organisationId,
      nangoConnectionId,
      isFirstSync: false,
      syncStartedAt,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
