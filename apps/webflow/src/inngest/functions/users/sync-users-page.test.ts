import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/webflow/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { env } from '@/common/env';
import { type WebflowUser } from '@/connectors/types';
import { syncUsersPage } from './sync-users-page';

const elbaUsers = [
  {
    id: 'user-id',
    role: 'member',
    additionalEmails: [],
    authMethod: undefined,
    displayName: 'username',
    email: 'user@gmail.com',
  },
];

const users: WebflowUser[] = [
  {id: 'user-id', data: {name: 'username', email: 'user@gmail.com'}}
];

const region = 'us';
const accessToken = 'access-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  accessToken,
  region,
};

const setup = createInngestFunctionMock(syncUsersPage, 'webflow/users.sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      organisationId: organisation.id,
      page: 0,
      region: 'us',
      siteId: 'test-id',
    });

    // assert the function throws a NonRetriableError that will inform inngest to definitly cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    // check that the function is not sending other event
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    await db.insert(Organisation).values(organisation);

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      users,
      pagination: {
        next: 10,
      },
    });

    // @ts-expect-error -- this is a mock
    vi.spyOn(crypto, 'decrypt').mockResolvedValue(undefined);

    const [result, { step }] = setup({
      organisationId: organisation.id,
      page: 0,
      region: organisation.region,
      siteId: 'test-id',
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith(organisation.accessToken);

    
    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users-page', {
      name: 'webflow/users.sync.requested',
      data: {
        organisationId: organisation.id,
        region: organisation.region,
        page: 10,
        siteId: 'test-id',
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    const elba = spyOnElba();
    await db.insert(Organisation).values(organisation);

    // @ts-expect-error -- this is a mock
    vi.spyOn(crypto, 'decrypt').mockResolvedValue(undefined);

    // mock the getUsers function that returns webflow users page, but this time the response does not indicate that their is a next page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      users,
      pagination: {
        next: null,
      },
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      page: 0,
      region: 'us',
      siteId: 'test-id',
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith(organisation.accessToken);

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      organisationId: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
      region: 'us',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({ users: elbaUsers });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('webflow/users.sync.completed', {
      name: 'webflow/users.sync.completed',
      data: {
        organisationId: organisation.id,
        siteId: 'test-id',
      },
    });
  });
});
