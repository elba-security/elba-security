/**
 * DISCLAIMER:
 * The tests provided in this file are specifically designed for the `syncUsers` function example.
 * These tests serve as a conceptual framework and are not intended to be used as definitive tests in a production environment.
 * They are meant to illustrate potential test scenarios and methodologies that might be relevant for a SaaS integration.
 * Developers should create their own tests tailored to the specific implementation details and requirements of their SaaS integration.
 * The mock data, assertions, and scenarios used here are simplified and may not cover all edge cases or real-world complexities.
 * It is crucial to expand upon these tests, adapting them to the actual logic and behaviors of your specific SaaS integration.
 */
import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/x-saas/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { env } from '@/common/env';
import { syncUsers } from './sync-users';

const accessToken = 'access-token';
const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  accessToken: await encrypt(accessToken),
  refreshToken: 'encrypted-refresh-token',
  region: 'us',
};
const syncStartedAt = Date.now();

const users: usersConnector.XSaasUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  username: `username-${i}`,
  email: `username-${i}@foo.bar`,
}));

const setup = createInngestFunctionMock(syncUsers, 'x-saas/users.sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    const elba = spyOnElba();
    const getUsers = vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      users,
      nextPage: null,
    });

    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      page: 0,
    });

    // assert the function throws a NonRetriableError that will inform inngest to definitly cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(getUsers).toBeCalledTimes(0);
    expect(elba).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    const elba = spyOnElba();
    // mock the getUser function that returns SaaS users page
    const getUsers = vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      nextPage: 1,
      users,
    });
    // setup the test with an organisation
    await db.insert(organisationsTable).values(organisation);

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: 0,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith(accessToken, 0);

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: users.map(({ id, email, username }) => ({
        id,
        email,
        displayName: username,
        additionalEmails: [],
      })),
    });

    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('request-next-users-page-sync', {
      name: 'x-saas/users.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        page: 1,
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    const elba = spyOnElba();
    // mock the getUser function that returns SaaS users page, but this time the response does not indicate that their is a next page
    const getUsers = vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      nextPage: null,
      users,
    });
    await db.insert(organisationsTable).values(organisation);

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: 0,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith(accessToken, 0);

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: users.map(({ id, email, username }) => ({
        id,
        email,
        displayName: username,
        additionalEmails: [],
      })),
    });
    // the function should not send another event that continue the pagination
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
