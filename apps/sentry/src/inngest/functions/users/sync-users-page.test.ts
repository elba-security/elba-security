import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { syncUsersPage } from './sync-users-page';
import { elbaUsers, users } from './__mocks__/integration';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: 'test-token',
  organizationSlug: 'test-Organization-id',
  region: 'us',
};
const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(syncUsersPage, 'sentry/users.page_sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      region: organisation.region,
      cursor: null,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    // setup the test with an organisation
    await db.insert(Organisation).values(organisation);
    // mock the getUsers function that returns Vercel users page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      pagination: {
        nextCursor: 'next-value',
      },
      members: users,
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      region: organisation.region,
      cursor: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users-page', {
      name: 'sentry/users.page_sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        region: organisation.region,
        cursor: 'next-value',
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    const elba = spyOnElba();
    await db.insert(Organisation).values(organisation);
    // mock the getUsers function that returns Sentry users page, but this time the response does not indicate that there is a next page
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      pagination: {
        nextCursor: null,
      },
      members: users,
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      region: organisation.region,
      cursor: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({ users: elbaUsers });

    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });

    // the function should not send another event that continue the pagination
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
