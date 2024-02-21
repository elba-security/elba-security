import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { syncUsersPage } from './sync-users-page';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  region: 'us',
  accessToken: 'some_data_access_token',
  refreshToken: 'some_data_refresh_token',
  expiresIn: new Date(Date.now()),
};
const syncStartedAt = Date.now();
const newPageToken = 'some_next_page_token';

const users: usersConnector.ZoomUser[] = Array.from({ length: 5 }, (_, i) => ({
  role_id: 1,
  id: `id-${i}`,
  pmi: `pmi-${i}`,
  last_name: `last-name-${i}`,
  first_name: `first-name-${i}`,
  email: `username-${i}@foo.bar`,
  display_name: `first-name_last-name-${i}`,
  phone_number: '9967834639',
}));

/* eslint-disable -- no type here */
const setup = createInngestFunctionMock(syncUsersPage as any, 'zoom/users.page_sync.requested');
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
      next_page_token: newPageToken,
      users,
      page_number: 1,
      page_size: 1,
      total_record: 5,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: 1,
      region: organisation.region,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    /* eslint-disable -- no type here */
    expect(step.sendEvent).toBeCalledWith('sync-users-page', {
      name: 'zoom/users.page_sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt: expect.any(Number),
        region: organisation.region,
        page: newPageToken,
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    await db.insert(Organisation).values(organisation);

    // mock the getUser function that returns SaaS users page, but this time the response does not indicate that their is a next page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      next_page_token: null,
      users,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: 0,
      region: organisation.region,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    // the function should not send another event that continue the pagination
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
