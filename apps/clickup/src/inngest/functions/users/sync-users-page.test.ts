import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { syncUsersPage } from './sync-users-page';
import { ClickUpUser } from '@/connectors/types';

const region = 'us';
const accessToken = 'access-token';
const teamId = 'team-id';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  accessToken,
  teamId,
  region,
};
const users: ClickUpUser[] = [
  {
    id: 'test-id',
    username: 'test-username',
    email: 'test-user-@foo.bar',
    role: 'test-role',
  },
];
const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(syncUsersPage, 'clickup/users.page_sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      region: 'us',
    });

    // assert the function throws a NonRetriableError that will inform inngest to definitly cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    // check that the function is not sending other event
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should sync when organisation is registered', async () => {
    // setup the test with an organisation
    await db.insert(Organisation).values(organisation);
    // mock the getUsers function that returns clickup users page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      users,
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      region: organisation.region,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    // check that the function deletes users that were synced before
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
