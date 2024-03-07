import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { syncUsersPage } from './sync-users-page';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  region: 'us',
  accessToken: await encrypt('some_data_access_token'),
  refreshToken: await encrypt('some_data_refresh_token'),
  expiresIn: new Date(Date.now()),
};
const syncStartedAt = Date.now();
const newPageToken = 2;

const users: usersConnector.SmartSheetUser[] = Array.from({ length: 5 }, (_, i) => ({
  email: `username-${i}@foo.bar`,
  name: `first-name_last-name-${i}`,
  firstName: `first-name-${i}`,
  lastName: `last-name-${i}`,
  admin: true,
  licensedSheetCreator: true,
  groupAdmin: false,
  resourceViewer: true,
  id: `id-${i}`,
  status: 'ACTIVE',
  sheetCount: 1,
}));

/* eslint-disable -- no type here */
const setup = createInngestFunctionMock(
  syncUsersPage as any,
  'smart-sheet/users.page_sync.requested'
);
const now = Date.now();
describe('sync-users', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should abort sync when organisation is not registered', async () => {
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: null,
      region: organisation.region,
    });

    // assert the function throws a NonRetriableError that will inform inngest to definitly cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    // check that the function is not sending other event
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    // setup the test with an organisation
    await db.insert(Organisation).values(organisation);

    // mock the getUser function that returns SaaS users page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      nextPage: 2,
      users,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: null,
      region: organisation.region,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users-page', {
      name: 'smart-sheet/users.page_sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        region: organisation.region,
        page: newPageToken,
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    await db.insert(Organisation).values(organisation);

    // mock the getUser function that returns SaaS users page, but this time the response does not indicate that their is a next page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      users,
      nextPage: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: 3,
      region: organisation.region,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    // the function should not send another event that continue the pagination
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
