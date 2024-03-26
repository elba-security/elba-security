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
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { syncUsersPage } from './sync-users-page';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  auth_token: 'test-token',
  region: 'us',
  domain: 'https://mysaas.zendesk.com',
  client_secret: 'supersecuresecret123',
  client_id: 'integration-test-client'
};

const syncStartedAt = Date.now();
const users: usersConnector.MySaasUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  name: `username-${i}`,
  email: `username-${i}@foo.bar`,
}));

const setup = createInngestFunctionMock(syncUsersPage, 'zendesk/users.sync.triggered');
describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      page: 0,
      region: 'us',
    });

    const elba = spyOnElba();
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(step.sendEvent).toBeCalledTimes(0);
    expect(elba).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    // setup the test with an organisation
    await db.insert(Organisation).values(organisation);
    
    const ts = Date.now();
    const [result, { step }] = setup({
      organisationId: organisation.id,
      authToken: organisation.auth_token,
      syncStartedAt: ts,
      region: 'us',
    });

    // mock the getUser function that returns SaaS users page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      next_page: "https://mysaas.zendesk.com/api/v2/users?page=2",
      previous_page: null,
      count: 2,
      users,
    });

    const elba = spyOnElba();
    
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
      users: users.map(({ id, mail, displayName }) => ({
        id: id as string,
        email: mail as string || null,
        displayName: displayName as string,
        additionalEmails: [],
      })),
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users-page', {
      name: 'zendesk/users.sync.triggered',
      data: {
        organisationId: organisation.id,
        authToken: organisation.auth_token,
        syncStartedAt: ts,
        region: organisation.region,
        pageUrl: "https://mysaas.zendesk.com/api/v2/users?page=2",
      },
    });

  });

  test('should finalize the sync when there is a no next page', async () => {
    await db.insert(Organisation).values(organisation);
    // mock the getUser function that returns SaaS users page, but this time the response does not indicate that their is a next page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      next_page: null,
      previous_page: "https://mysaas.zendesk.com/api/v2/users?page=2",
      count: 2,
      users,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: 0,
      region: 'us',
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    // the function should not send another event that continue the pagination
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
