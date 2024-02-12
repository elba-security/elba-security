import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/microsoft/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import type { MicrosoftUser } from '@/connectors/microsoft/users';
import { env } from '@/env';
import { encrypt } from '@/common/crypto';
import { syncUsers } from './sync-users';

const token = 'test-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt(token),
  tenantId: 'tenant-id',
  region: 'us',
};
const syncStartedAt = Date.now();

const users: MicrosoftUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `user-id-${i}`,
  mail: `user-${i}@foo.bar`,
  userPrincipalName: `user-${i}`,
  displayName: `user ${i}`,
}));

const setup = createInngestFunctionMock(syncUsers, 'microsoft/users.sync.triggered');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    const elba = spyOnElba();
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      nextSkipToken: null,
      validUsers: users,
      invalidUsers: [],
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      skipToken: '0',
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(usersConnector.getUsers).toBeCalledTimes(0);

    expect(elba).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    const nextSkipToken = 'next-skip-token';
    const skipToken = null;
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      nextSkipToken,
      validUsers: users,
      invalidUsers: [],
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      skipToken,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(usersConnector.getUsers).toBeCalledTimes(1);
    expect(usersConnector.getUsers).toBeCalledWith({
      tenantId: organisation.tenantId,
      token,
      skipToken,
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
      users: users.map(({ id, mail, displayName, userPrincipalName }) => ({
        id,
        email: mail || null,
        displayName: displayName || userPrincipalName,
        additionalEmails: [],
      })),
    });

    expect(elbaInstance?.users.delete).toBeCalledTimes(0);

    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-next-users-page', {
      name: 'microsoft/users.sync.triggered',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        skipToken: nextSkipToken,
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    const nextSkipToken = null;
    const skipToken = 'skip-token';
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      nextSkipToken,
      validUsers: users,
      invalidUsers: [],
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      skipToken,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(usersConnector.getUsers).toBeCalledTimes(1);
    expect(usersConnector.getUsers).toBeCalledWith({
      tenantId: organisation.tenantId,
      token,
      skipToken,
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
      users: users.map(({ id, mail, displayName, userPrincipalName }) => ({
        id,
        email: mail || null,
        displayName: displayName || userPrincipalName,
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
