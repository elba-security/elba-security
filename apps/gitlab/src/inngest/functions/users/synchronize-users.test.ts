import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/gitlab/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/common/env';
import { encrypt } from '@/common/crypto';
import { synchronizeUsers } from './synchronize-users';

const accessToken = 'access-token';
const refreshToken = 'refresh-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  accessToken: await encrypt(accessToken),
  refreshToken: await encrypt(refreshToken),
  region: 'us',
};
const syncStartedAt = Date.now();

const users: usersConnector.GitlabUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  username: `username-${i}`,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
}));

const nextPage = 1;

const setup = createInngestFunctionMock(synchronizeUsers, 'gitlab/users.sync.triggered');

describe('synchronize-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    const elba = spyOnElba();
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      users,
      nextPage,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      page: null,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(elba).toBeCalledTimes(0);
    expect(usersConnector.getUsers).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      users,
      nextPage,
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: '0',
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(usersConnector.getUsers).toBeCalledTimes(1);
    expect(usersConnector.getUsers).toBeCalledWith({
      accessToken,
      page: '0',
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
      users: users.map(({ id, username, name, email }) => ({
        id,
        email: email || null,
        displayName: name || username,
        additionalEmails: [],
      })),
    });

    expect(elbaInstance?.users.delete).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-users', {
      name: 'gitlab/users.sync.triggered',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        page: '1',
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      users,
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
      accessToken,
      page: null,
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
      users: users.map(({ id, username, name, email }) => ({
        id,
        email: email || null,
        displayName: name || username,
        additionalEmails: [],
      })),
    });

    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
