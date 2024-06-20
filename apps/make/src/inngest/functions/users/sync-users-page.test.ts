import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/make/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { env } from '@/common/env';
import { syncUsersPage } from './sync-users-page';

const elbaUsers = [
  {
    id: 'user-id',
    role: 'member',
    additionalEmails: [],
    authMethod: 'password',
    displayName: 'username',
    email: 'user@gmail.com',
  },
];

const users: usersConnector.MakeUser[] = [
  {id: 'user-id', email: 'user@gmail.com', name: 'username'},
];

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: 'test-token',
  zoneDomain: 'test-zone',
  region: 'us',
};
const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(syncUsersPage, 'make/users.page_sync.requested');

describe('sync-users-page', () => {
  test('should abort sync when organisation is not registered', async () => {
    const [result, { step }] = setup({
      organisationId: organisation.id,
      region: organisation.region,
      page: 0,
      sourceOrganizationId: 'test-id'
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    // setup the test with an organisation
    await db.insert(Organisation).values(organisation);
    // @ts-expect-error -- this is a mock
    vi.spyOn(crypto, 'decrypt').mockResolvedValue(undefined);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      users,
      pagination: { next: 10 },
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      region: organisation.region,
      page: 0,
      sourceOrganizationId: 'test-id'
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith(organisation.token);


    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users-page', {
      name: 'make/users.page_sync.requested',
      data: {
        organisationId: organisation.id,
        region: organisation.region,
        page: 10,
        sourceOrganizationId: 'test-id'
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    const elba = spyOnElba();
    await db.insert(Organisation).values(organisation);
    // @ts-expect-error -- this is a mock
    vi.spyOn(crypto, 'decrypt').mockResolvedValue(undefined);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      users,
      pagination: { next: null },
    });
    
    const [result, { step }] = setup({
      organisationId: organisation.id,
      region: organisation.region,
      page: 0,
      sourceOrganizationId: 'test-id'
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      organisationId: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
      region: 'us',
    });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith(organisation.token);

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({ users: elbaUsers });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('make/users.organization_sync.completed', {
      name: 'make/users.organization_sync.completed',
      data: {
        organisationId: organisation.id,
        sourceOrganizationId: 'test-id',
      },
    });
  });
});
