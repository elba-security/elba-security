import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/pagerduty/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { syncUsers } from './sync-users';

const syncStartedAt = Date.now();
const syncedBefore = Date.now();
const nextPage = 1;
const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt('test-access-token'),
  refreshToken: await encrypt('test-refresh-token'),
  region: 'us',
  subDomain: 'subdomain',
};
const users: usersConnector.PagerdutyUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: `id-${i}`,
  name: `userName-${i}`,
  role: 'admin',
  email: `user-${i}@foo.bar`,
  invitation_sent: false,
}));

const setup = createInngestFunctionMock(syncUsers, 'pagerduty/users.sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: null,
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
    const elba = spyOnElba();

    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: String(nextPage),
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users', {
      name: 'pagerduty/users.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        page: String(nextPage),
      },
    });

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'userName-0',
          email: 'user-0@foo.bar',
          id: 'id-0',
          role: 'admin',
          url: 'https://subdomain.pagerduty.com/users/id-0',
          isSuspendable: true,
        },
        {
          additionalEmails: [],
          displayName: 'userName-1',
          email: 'user-1@foo.bar',
          role: 'admin',
          id: 'id-1',
          url: 'https://subdomain.pagerduty.com/users/id-1',
          isSuspendable: true,
        },
      ],
    });
    expect(elbaInstance?.users.delete).not.toBeCalled();
  });

  test('should finalize the sync when there is a no next page', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'userName-0',
          email: 'user-0@foo.bar',
          id: 'id-0',
          role: 'admin',
          url: 'https://subdomain.pagerduty.com/users/id-0',
          isSuspendable: true,
        },
        {
          additionalEmails: [],
          displayName: 'userName-1',
          email: 'user-1@foo.bar',
          id: 'id-1',
          role: 'admin',
          url: 'https://subdomain.pagerduty.com/users/id-1',
          isSuspendable: true,
        },
      ],
    });
    const syncBeforeAtISO = new Date(syncedBefore).toISOString();
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({ syncedBefore: syncBeforeAtISO });
    // the function should not send another event that continue the pagination
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
