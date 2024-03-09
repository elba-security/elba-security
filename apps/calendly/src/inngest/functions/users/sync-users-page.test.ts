import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { syncUsersPage } from './sync-users-page';

export const users = Array.from({ length: 10 }, (_, i) => ({
  role: 'admin',
  uri: `uri-${i}`,
  user: { name: `user-${i}`, email: `username-${i}@foo.bar` },
}));

const region = 'us';
const accessToken = 'access-token';
const refreshToken = 'refresh-token';
const organizationUri = 'org-uri';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  accessToken,
  refreshToken,
  organizationUri,
  region,
};
const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(syncUsersPage, 'calendly/users.page_sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      page: '0',
      region: 'us',
    });

    // assert the function throws a NonRetriableError that will inform inngest to definitly cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    // check that the function is not sending other event
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    // setup the test with an organisation
    await db.insert(Organisation).values(organisation);
    // mock the getOrganizationMembers function that returns Calendly users page
    vi.spyOn(usersConnector, 'getOrganizationMembers').mockResolvedValue({
      collection: users,
      pagination: {
        count: 1,
        next_page: 'next-page',
        next_page_token: 'next-page-token',
        previous_page: 'previous-page',
        previous_page_token: 'previous-page-token',
      },
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: '0',
      region: organisation.region,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users-page', {
      name: 'calendly/users.page_sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        region: organisation.region,
        page: 'next-page-token',
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    await db.insert(Organisation).values(organisation);
    // mock the getOrganizationMembers function that returns Calendly users page, but this time the response does not indicate that their is a next page
    vi.spyOn(usersConnector, 'getOrganizationMembers').mockResolvedValue({
      collection: users,
      pagination: {
        count: 1,
        next_page: null,
        next_page_token: null,
        previous_page: 'previous-page',
        previous_page_token: 'previous-token',
      },
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: '0',
      region: 'us',
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    // the function should not send another event that continue the pagination
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
