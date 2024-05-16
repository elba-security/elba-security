/**
 * DISCLAIMER:
 * The tests provided in this file are specifically designed for the `syncUsersPage` function example.
 * These tests serve as a conceptual framework and are not intended to be used as definitive tests in a production environment.
 * They are meant to illustrate potential test scenarios and methodologies that might be relevant for a SaaS integration.
 * Developers should create their own tests tailored to the specific implementation details and requirements of their SaaS integration.
 * The mock data, assertions, and scenarios used here are simplified and may not cover all edge cases or real-world complexities.
 * It is crucial to expand upon these tests, adapting them to the actual logic and behaviors of your specific SaaS integration.
 */
import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { syncUsersPage } from './sync-users-page';

const authKey = 'test-auth-key';
const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  authEmail: 'test-email@example.com',
  authKey: await encrypt(authKey),
  region: 'us',
};
const syncStartedAt = Date.now();

const users: usersConnector.CloudflareUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  user: {
    first_name: 'first-name',
    last_name: 'last-name',
    email: `username-${i}@gmail.com`,
  },
  email: `username-${i}@foo.bar`,
}));

const setup = createInngestFunctionMock(syncUsersPage, 'cloudflare/users.page_sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      page: 1,
      region: 'us',
    });

    // assert the function throws a NonRetriableError that will inform inngest to definitly cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    // check that the function is not sending other event
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    // setup the test with an organisation
    await db.insert(Organisation).values(organisation);
    // mock the getUser function that returns SaaS users page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      nextPage: 2,
      users,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      region: organisation.region,
      syncStartedAt,
      page: 1,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users-page', {
      name: 'cloudflare/users.page_sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        region: organisation.region,
        page: 2,
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    await db.insert(Organisation).values(organisation);
    // mock the getUser function that returns SaaS users page, but this time the response does not indicate that their is a next page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      nextPage: null,
      users,
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: 3,
      region: organisation.region,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    // the function should not send another event that continue the pagination
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
