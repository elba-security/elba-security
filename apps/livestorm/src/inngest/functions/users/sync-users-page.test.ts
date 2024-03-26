import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { syncUsersPage } from './sync-users-page';
import { users } from './__mocks__/integration';

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

    // Mock the getUsers function that returns Livestorm users page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      pagination: {
        current_page: 0,
        previous_page: null,
        next_page: 1,
        record_count: 20,
        page_count: 2,
        items_per_page: 10,
      },
      users,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      region: organisation.region,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

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
    await db.insert(Organisation).values(organisation);

    // Mock the getUsers function that returns Livestorm users page without a next page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      pagination: {
        current_page: 0,
        previous_page: null,
        next_page: null,
        record_count: 10,
        page_count: 1,
        items_per_page: 10,
      },
      users,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      region: organisation.region,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    // Ensure the function does not send another event to continue pagination
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
