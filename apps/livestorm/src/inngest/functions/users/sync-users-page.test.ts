import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { syncUsersPage } from './sync-users-page';
import { elbaUsers, users } from './__mocks__/integration';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: 'test-token',
  teamId: 'test-team-id',
  region: 'us',
};
const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(syncUsersPage, 'livestorm/users.page_sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    // Setup the test without organisation entries in the database
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      region: organisation.region,
      page: null,
    });

    // Assert that the function throws a NonRetriableError
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    // Ensure the function does not send any other event
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    // Setup the test with an organisation
    await db.insert(Organisation).values(organisation);
    // @ts-expect-error -- this is a mock
    vi.spyOn(crypto, 'decrypt').mockResolvedValue(undefined);

    // Mock the getUsers function that returns Livestorm users page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      meta: {
        next_page: 1,
      },
      data: users,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      region: organisation.region,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith(organisation.token);

    // Ensure the function continues the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users-page', {
      name: 'livestorm/users.page_sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        region: organisation.region,
        page: 1,
      },
    });
  });

  test('should finalize the sync when there is no next page', async () => {
    const elba = spyOnElba();
    await db.insert(Organisation).values(organisation);
    // @ts-expect-error -- this is a mock
    vi.spyOn(crypto, 'decrypt').mockResolvedValue(undefined);

    // Mock the getUsers function that returns Livestorm users page without a next page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      meta: {
        next_page: null,
      },
      data: users,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      region: organisation.region,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      baseUrl: 'https://elba.local/api',
      organisationId: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
      region: 'us',
    });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith(organisation.token);

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({ users: elbaUsers });

    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });

    // Ensure the function does not send another event to continue pagination
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
