import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/statsig/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { syncUsers } from './sync-users';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  apiKey: await encrypt('test-personal-key'),
  region: 'us',
};

const users: usersConnector.StatsigUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: `user-email-${i}@alpha.com`,
  email: `user-email-${i}@alpha.com`,
  firstName: `first-name-${i}`,
  lastName: `last-name-${i}`,
  role: 'member',
}));

const syncStartedAt = Date.now();
const syncedBefore = Date.now();

const setup = createInngestFunctionMock(syncUsers, 'statsig/users.sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when the organization is registered', async () => {
    const elba = spyOnElba();

    await db.insert(organisationsTable).values(organisation);

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
    });

    const [result] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'first-name-0 last-name-0',
          email: 'user-email-0@alpha.com',
          id: 'user-email-0@alpha.com',
          role: 'member',
        },
        {
          additionalEmails: [],
          displayName: 'first-name-1 last-name-1',
          email: 'user-email-1@alpha.com',
          id: 'user-email-1@alpha.com',
          role: 'member',
        },
      ],
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    const elba = spyOnElba();

    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'first-name-0 last-name-0',
          email: 'user-email-0@alpha.com',
          id: 'user-email-0@alpha.com',
          role: 'member',
        },
        {
          additionalEmails: [],
          displayName: 'first-name-1 last-name-1',
          email: 'user-email-1@alpha.com',
          id: 'user-email-1@alpha.com',
          role: 'member',
        },
      ],
    });
    const syncBeforeAtISO = new Date(syncedBefore).toISOString();
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({
      syncedBefore: syncBeforeAtISO,
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
