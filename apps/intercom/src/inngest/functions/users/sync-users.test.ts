import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/intercom/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { synchronizeUsers } from './sync-users';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: 'test-access-token',
  region: 'us',
};
const syncStartedAt = Date.now();

const users: usersConnector.IntercomUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  name: `name-${i}`,
  username: `username-${i}`,
  active: true,
  email: `user-${i}@foo.bar`,
}));

const next = 'some next page';
const setup = createInngestFunctionMock(synchronizeUsers, 'intercom/users.sync.requested');

describe('synchronize-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: null,
    });

    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      page: null,
    });

    // assert the function throws a NonRetriableError that will inform inngest to definitly cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(usersConnector.getUsers).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    // setup the test with an organisation
    await db.insert(organisationsTable).values(organisation);
    // mock the getUser function that returns SaaS users page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: 'some page',
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: next,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });
    expect(usersConnector.getUsers).toBeCalledTimes(1);
    expect(usersConnector.getUsers).toBeCalledWith({
      token: organisation.accessToken,
      next,
    });

    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-users', {
      name: 'intercom/users.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        region: organisation.region,
        page: 'some page',
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    await db.insert(organisationsTable).values(organisation);
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

    expect(usersConnector.getUsers).toBeCalledTimes(1);
    expect(usersConnector.getUsers).toBeCalledWith({
      token: organisation.accessToken,
      next: null,
    });
    // the function should not send another event that continue the pagination
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
