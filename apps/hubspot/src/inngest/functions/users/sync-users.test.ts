import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/hubspot/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { syncUsers } from './sync-users';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  authUserId: 'id-1',
  accessToken: await encrypt('test-access-token'),
  refreshToken: await encrypt('test-refresh-token'),
  timeZone: 'us/eastern',
  region: 'us',
  domain: 'foo-bar.hubspot.com',
  portalId: 12345,
};
const syncStartedAt = Date.now();
const syncedBefore = Date.now();
const nextPage = '1';
const users: usersConnector.HubspotUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: `id-${i}`,
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
  email: `user-${i}@foo.bar`,
  superAdmin: i === 1,
}));

const setup = createInngestFunctionMock(syncUsers, 'hubspot/users.sync.requested');

describe('synchronize-users', () => {
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
      page: nextPage,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-users', {
      name: 'hubspot/users.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        page: nextPage,
      },
    });

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'firstName-0 lastName-0',
          email: 'user-0@foo.bar',
          id: 'id-0',
          role: 'user',
          isSuspendable: true,
          url: 'https://foo-bar.hubspot.com/settings/12345/users/user/id-0',
        },
        {
          additionalEmails: [],
          displayName: 'firstName-1 lastName-1',
          email: 'user-1@foo.bar',
          id: 'id-1',
          role: 'admin',
          isSuspendable: false,
          url: 'https://foo-bar.hubspot.com/settings/12345/users/user/id-1',
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
          displayName: 'firstName-0 lastName-0',
          email: 'user-0@foo.bar',
          id: 'id-0',
          role: 'user',
          isSuspendable: true,
          url: 'https://foo-bar.hubspot.com/settings/12345/users/user/id-0',
        },
        {
          additionalEmails: [],
          displayName: 'firstName-1 lastName-1',
          email: 'user-1@foo.bar',
          id: 'id-1',
          role: 'admin',
          isSuspendable: false,
          url: 'https://foo-bar.hubspot.com/settings/12345/users/user/id-1',
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
