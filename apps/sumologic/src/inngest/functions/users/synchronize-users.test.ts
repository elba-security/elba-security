import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { synchronizeUsers } from './synchronize-users';

const nextPage = 'next-page';
const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  accessId: await encrypt('test-access-id'),
  accessKey: await encrypt('test-access-key'),
  sourceRegion: 'EU',
  region: 'us',
};

const users: usersConnector.SumologicUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
  isActive: true,
  email: `user-${i}@foo.bar`,
  isMfaEnabled: false,
}));

const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(synchronizeUsers, 'sumologic/users.sync.requested');

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

    // check that the function deletes users that were synced before
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-users', {
      name: 'sumologic/users.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        page: nextPage,
      },
    });
  });
});

test('should finalize the sync when there is a no next page', async () => {
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

  // the function should not send another event that continue the pagination
  expect(step.sendEvent).toBeCalledTimes(0);
});