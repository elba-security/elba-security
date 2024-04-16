import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { synchronizeUsers } from './synchronize-users';

const nextPage = '1';
const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  apiKey: await encrypt('test-api-key'),
  region: 'us',
};

const users: usersConnector.StatsigUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: `user-${i}@foo.bar`,
  email: `user-${i}@foo.bar`,
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
  role: `owner`,
}));

const syncStartedAt = Date.now();
const syncedBefore = Date.now();

const setup = createInngestFunctionMock(synchronizeUsers, 'statsig/users.sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      page: null,
    });

    // assert the function throws a NonRetriableError that will inform inngest to definitly cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    // check that the function is not sending other event
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when the organization is registered', async () => {
    const elba = spyOnElba();

    // setup the test with an organisation
    await db.insert(Organisation).values(organisation);

    // mock the getUser function that returns SaaS users page
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
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'firstName-0 lastName-0',
          email: 'user-0@foo.bar',
          id: 'user-0@foo.bar',
          role: 'admin',
        },
        {
          additionalEmails: [],
          displayName: 'firstName-1 lastName-1',
          email: 'user-1@foo.bar',
          id: 'user-1@foo.bar',
          role: 'admin',
        },
      ],
    });
    // check that the function deletes users that were synced before
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-users', {
      name: 'statsig/users.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        page: nextPage,
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    const elba = spyOnElba();

    await db.insert(Organisation).values(organisation);
    // mock the getUser function that returns SaaS users page, but this time the response does not indicate that their is a next page
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
          id: 'user-0@foo.bar',
          role: 'admin',
        },
        {
          additionalEmails: [],
          displayName: 'firstName-1 lastName-1',
          email: 'user-1@foo.bar',
          id: 'user-1@foo.bar',
          role: 'admin',
        },
      ],
    });
    const syncBeforeAtISO = new Date(syncedBefore).toISOString();
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({
      syncedBefore: syncBeforeAtISO,
    });
    // the function should not send another event that continue the pagination
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
