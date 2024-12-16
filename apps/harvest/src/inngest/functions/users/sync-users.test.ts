import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/harvest/users';
import { syncUsers } from './sync-users';

const organisationId = '00000000-0000-0000-0000-000000000001';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const syncStartedAt = Date.now();
const users: usersConnector.HarvestUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: i,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  email: `user-${i}@foo.bar`,
  access_roles: ['member'],
  is_active: true,
  created_at: '2021-01-01T00:00:00Z',
  updated_at: `2021-01-0${i + 1}T00:00:00Z`,
}));

const user = {
  authUserId: 'test-auth-user-id',
};
const companyInfo = {
  companyDomain: 'test-company-domain',
};
const setup = createInngestFunctionMock(syncUsers, 'harvest/users.sync.requested');

describe('synchronize-users', () => {
  test('should continue the sync when there is a next page', async () => {
    vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue(user);
    vi.spyOn(usersConnector, 'getCompanyDomain').mockResolvedValue(companyInfo);

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
    expect(step.sendEvent).toBeCalledWith('synchronize-users', {
      name: 'harvest/users.sync.requested',
      data: {
        organisationId,
        region,
        nangoConnectionId,
        isFirstSync: false,
        syncStartedAt,
        page: 'some page',
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: null,
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
