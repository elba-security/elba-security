import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import * as authConnector from '@/connectors/auth';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { users } from '@/connectors/__mocks__/users';
import { syncUsersPage } from './sync-users-page';

const region = 'us';
const clientId = 'test-client-id';
const clientSecret = 'test-client-secret';
const domain = 'test-domain';
const audience = 'test-audience';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  clientId,
  clientSecret,
  domain,
  audience,
  region,
};
const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(syncUsersPage, 'auth0/users.page_sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      region: 'us',
      page: 0,
    });

    // assert the function throws a NonRetriableError that will inform inngest to definitly cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    // check that the function is not sending other event
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    // setup the test with an organisation
    await db.insert(Organisation).values(organisation);
    // mock the getToken function that returns management api access token
    vi.spyOn(authConnector, 'getToken').mockResolvedValue({
      access_token: 'access-token',
      expires_in: 'expiry-time',
      scope: 'scope',
      token_type: 'bearer',
    });
    // mock the getUsers function that returns auth0 users page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      users,
      pagination: { nextPage: 10 },
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      region: organisation.region,
      page: 0,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users-page', {
      name: 'auth0/users.page_sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        region: organisation.region,
        page: 10,
      },
    });
  });

  test('should finalize the sync when there is a no next range', async () => {
    await db.insert(Organisation).values(organisation);
    // mock the getToken function that returns management api access token
    vi.spyOn(authConnector, 'getToken').mockResolvedValue({
      access_token: 'access-token',
      expires_in: 'expiry-time',
      scope: 'scope',
      token_type: 'bearer',
    });
    // mock the getUsers function that returns auth0 users page, but this time the response does not indicate that their is a next range
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      users,
      pagination: { nextPage: null },
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      region: 'us',
      page: 0,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    // the function should not send another event that continue the pagination
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
