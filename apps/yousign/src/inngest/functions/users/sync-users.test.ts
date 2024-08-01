import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/yousign/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import type { YousignUser } from '@/connectors/yousign/users';
import { encrypt } from '@/common/crypto';
import { syncUsers } from './sync-users';

const apiKey = 'test-access-token';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  apiKey: await encrypt(apiKey),
  region: 'us',
};
const syncStartedAt = Date.now();
const syncedBefore = Date.now();
const nextPage = '1';
const validUsers: YousignUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: `00000000-0000-0000-0000-00000000000${i}`,
  first_name: `firstname-${i}`,
  last_name: `lastname-${i}`,
  is_active: true,
  email: `user-${i}@foo.bar`,
  role: 'owner',
}));

const setup = createInngestFunctionMock(syncUsers, 'yousign/users.sync.requested');

describe('synchronize-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers,
      invalidUsers: [],
      nextPage: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      page: null,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(usersConnector.getUsers).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    const elba = spyOnElba();

    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers,
      invalidUsers: [],
      nextPage,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: String(nextPage),
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-users', {
      name: 'yousign/users.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        page: String(nextPage),
      },
    });

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'firstname-0 lastname-0',
          email: 'user-0@foo.bar',
          id: '00000000-0000-0000-0000-000000000000',
          role: 'owner',
        },
        {
          additionalEmails: [],
          displayName: 'firstname-1 lastname-1',
          email: 'user-1@foo.bar',
          id: '00000000-0000-0000-0000-000000000001',
          role: 'owner',
        },
      ],
    });
    expect(elbaInstance?.users.delete).not.toBeCalled();
  });

  test('should finalize the sync when there is a no next page', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers,
      invalidUsers: [],
      nextPage: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'firstname-0 lastname-0',
          email: 'user-0@foo.bar',
          id: '00000000-0000-0000-0000-000000000000',
          role: 'owner',
        },
        {
          additionalEmails: [],
          displayName: 'firstname-1 lastname-1',
          email: 'user-1@foo.bar',
          id: '00000000-0000-0000-0000-000000000001',
          role: 'owner',
        },
      ],
    });
    const syncBeforeAtISO = new Date(syncedBefore).toISOString();
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({ syncedBefore: syncBeforeAtISO });
    // the function should not send another event that continue the pagination
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
