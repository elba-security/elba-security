import { expect, test, describe, vi, beforeAll } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import type { MondayUser } from '@/connectors/monday/users';
import * as usersConnector from '@/connectors/monday/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { syncUsers } from './sync-users';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  token: 'test-token',
  region: 'us',
};

const syncStartedAt = Date.now();

const users: MondayUser[] = Array.from({ length: 3 }, (_, i) => ({
  id: `id-${i}`,
  name: `user-name-${i}`,
  email: `user${i}@foo.bar`,
}));

const setup = createInngestFunctionMock(syncUsers, 'monday/users.sync.requested');

describe('sync-users', () => {
  beforeAll(() => {
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('mock-token');
  });

  test('should abort sync when organisation is not registered', async () => {
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      page: 1,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      nextPage: 2,
      invalidUsers: [],
      validUsers: users,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: 1,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users-page', {
      name: 'monday/users.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        page: 2,
      },
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'user-name-0',
          email: 'user0@foo.bar',
          id: 'id-0',
        },
        {
          additionalEmails: [],
          displayName: 'user-name-1',
          email: 'user1@foo.bar',
          id: 'id-1',
        },
        {
          additionalEmails: [],
          displayName: 'user-name-2',
          email: 'user2@foo.bar',
          id: 'id-2',
        },
      ],
    });
    expect(elbaInstance?.users.delete).toBeCalledTimes(0);
  });

  test('should finalize the sync when there is a no next page', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      nextPage: null,
      invalidUsers: [],
      validUsers: users,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
    expect(step.sendEvent).toBeCalledTimes(0);
    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'user-name-0',
          email: 'user0@foo.bar',
          id: 'id-0',
        },
        {
          additionalEmails: [],
          displayName: 'user-name-1',
          email: 'user1@foo.bar',
          id: 'id-1',
        },
        {
          additionalEmails: [],
          displayName: 'user-name-2',
          email: 'user2@foo.bar',
          id: 'id-2',
        },
      ],
    });
    const syncBeforeAtISO = new Date(syncStartedAt).toISOString();
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({ syncedBefore: syncBeforeAtISO });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
