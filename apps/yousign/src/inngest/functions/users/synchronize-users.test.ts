import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { synchronizeUsers } from './synchronize-users';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt('test-api-key'),
  region: 'us',
};

const users: usersConnector.YousignUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
  first_name: `firstName-${i}`,
  last_name: `lastName-${i}`,
  is_active: true,
  role: 'owner',
  phone_number: `12345${i}`,
  email: `user-${i}@foo.bar`,
}));

const syncStartedAt = Date.now();
const nextCursor = 'test-next-cursor';

const setup = createInngestFunctionMock(synchronizeUsers, 'yousign/users.sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      page: null,
    });

    // assert the function throws a NonRetriableError that will inform inngest to definitly cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    // check that the function is not sending other event
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when the organization is registered', async () => {
    // setup the test with an organisation
    await db.insert(Organisation).values(organisation);

    // mock the getUser function that returns SaaS users page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
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

    // check that the function deletes users that were synced before
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
