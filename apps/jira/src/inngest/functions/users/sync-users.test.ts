import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import type { JiraUser } from '@/connectors/jira/users';
import { env } from '@/env';
import * as usersConnector from '@/connectors/jira/users';
import { syncUsers } from './sync-users';

const organisation = {
  id: '11111111-1111-1111-1111-111111111111',
  refreshToken: 'refresh-token-123',
  region: 'us-test-1',
  accessToken: 'access-token-123',
  tokenExpiration: 60,
  cloudId: '00000000-0000-0000-0000-000000000000',
};

const syncStartedAt = Date.now();

const users: JiraUser[] = Array.from({ length: 5 }, (_, i) => ({
  accountId: `user-id-${i}`,
  emailAddress: `user-${i}@foo.bar`,
  userPrincipalName: `user-${i}`,
  displayName: `user ${i}`,
}));

const setup = createInngestFunctionMock(syncUsers, 'jira/users.sync.triggered');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    const elba = spyOnElba();
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      startAtNext: null,
      validUsers: users,
      invalidUsers: [],
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      startAt: 0,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(usersConnector.getUsers).toBeCalledTimes(0);

    expect(elba).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    const startAtNext = 5;
    const startAt = 0;
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      startAtNext,
      validUsers: users,
      invalidUsers: [],
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      startAt: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(usersConnector.getUsers).toBeCalledTimes(1);
    expect(usersConnector.getUsers).toBeCalledWith({
      accessToken: organisation.accessToken,
      cloudId: organisation.cloudId,
      startAt,
    });

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
      users: users.map(({ accountId, emailAddress, displayName }) => ({
        id: accountId,
        email: emailAddress || null,
        displayName,
        additionalEmails: [],
      })),
    });

    expect(elbaInstance?.users.delete).toBeCalledTimes(0);

    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-next-users-page', {
      name: 'jira/users.sync.triggered',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        startAt: startAtNext,
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    const startAtNext = null;
    const startAt = 5;
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      startAtNext,
      validUsers: users,
      invalidUsers: [],
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      startAt,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(usersConnector.getUsers).toBeCalledTimes(1);
    expect(usersConnector.getUsers).toBeCalledWith({
      accessToken: organisation.accessToken,
      cloudId: organisation.cloudId,
      startAt,
    });

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
      users: users.map(({ accountId, emailAddress, displayName }) => ({
        id: accountId,
        email: emailAddress || null,
        displayName,
        additionalEmails: [],
      })),
    });

    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });

    // check that the function does not continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
