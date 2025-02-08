import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/airslate/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { syncUsers } from './sync-users';

const syncStartedAt = Date.now();
const syncedBefore = Date.now();
const nextPage = '1';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt('test-access-token'),
  refreshToken: await encrypt('test-refresh-token'),
  workspaceId: 'test-workspace-id',
  workspaceSubdomain: 'test-workspace-subdomain',
  region: 'us',
};

const users: usersConnector.AirslateUser[] = Array.from({ length: 3 }, (_, i) => ({
  id: `00000000-0000-0000-0000-00000000009${i}`,
  email: `user-${i}@foo.bar`,
  username: `username-${i}`,
  org_data: {
    status: 'ACTIVE',
  },
  role: {
    code: 'MEMBER',
  },
}));

const setup = createInngestFunctionMock(syncUsers, 'airslate/users.sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      page: '1',
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(usersConnector.getUsers).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    const elba = spyOnElba();

    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: nextPage,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users', {
      name: 'airslate/users.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        page: nextPage,
      },
    });

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'username-0',
          email: 'user-0@foo.bar',
          id: '00000000-0000-0000-0000-000000000090',
          role: 'MEMBER',
          isSuspendable: true,
          url: 'https://test-workspace-subdomain.airslate.com/management',
        },
        {
          additionalEmails: [],
          displayName: 'username-1',
          email: 'user-1@foo.bar',
          role: 'MEMBER',
          id: '00000000-0000-0000-0000-000000000091',
          isSuspendable: true,
          url: 'https://test-workspace-subdomain.airslate.com/management',
        },
        {
          additionalEmails: [],
          displayName: 'username-2',
          email: 'user-2@foo.bar',
          role: 'MEMBER',
          id: '00000000-0000-0000-0000-000000000092',
          isSuspendable: true,
          url: 'https://test-workspace-subdomain.airslate.com/management',
        },
      ],
    });
    expect(elbaInstance?.users.delete).not.toBeCalled();
  });

  test('should finalize the sync when there is a no next page', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: '1',
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'username-0',
          email: 'user-0@foo.bar',
          id: '00000000-0000-0000-0000-000000000090',
          role: 'MEMBER',
          isSuspendable: true,
          url: 'https://test-workspace-subdomain.airslate.com/management',
        },
        {
          additionalEmails: [],
          displayName: 'username-1',
          email: 'user-1@foo.bar',
          role: 'MEMBER',
          id: '00000000-0000-0000-0000-000000000091',
          isSuspendable: true,
          url: 'https://test-workspace-subdomain.airslate.com/management',
        },
        {
          additionalEmails: [],
          displayName: 'username-2',
          email: 'user-2@foo.bar',
          role: 'MEMBER',
          id: '00000000-0000-0000-0000-000000000092',
          isSuspendable: true,
          url: 'https://test-workspace-subdomain.airslate.com/management',
        },
      ],
    });
    const syncBeforeAtISO = new Date(syncedBefore).toISOString();
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({ syncedBefore: syncBeforeAtISO });
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
