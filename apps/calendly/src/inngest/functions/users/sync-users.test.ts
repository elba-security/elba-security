import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/calendly/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { syncUsers } from './sync-users';

const syncStartedAt = Date.now();
const syncedBefore = Date.now();
const nextPage = '1';
const organizationUri = 'some-org-uri';
const authUserUri = 'https://test-uri/users/00000000-0000-0000-0000-000000000091';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt('test-access-token'),
  refreshToken: await encrypt('test-refresh-token'),
  organizationUri,
  region: 'us',
  authUserUri,
};

const roles = ['owner', 'admin', 'user'];

const users: usersConnector.CalendlyUser[] = Array.from({ length: 3 }, (_, i) => ({
  uri: `https://test-uri/organization_memberships/00000000-0000-0000-0000-00000000009${i}`,
  role: roles[i] ?? 'user',
  user: {
    name: `name-${i}`,
    email: `user-${i}@foo.bar`,
    uri: `https://test-uri/users/00000000-0000-0000-0000-00000000009${i}`,
  },
}));

const setup = createInngestFunctionMock(syncUsers, 'calendly/users.sync.requested');

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
      name: 'calendly/users.sync.requested',
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
          displayName: 'name-0',
          email: 'user-0@foo.bar',
          id: '00000000-0000-0000-0000-000000000090',
          role: 'owner',
          isSuspendable: false,
          url: 'https://calendly.com/app/admin/users',
        },
        {
          additionalEmails: [],
          displayName: 'name-1',
          email: 'user-1@foo.bar',
          role: 'admin',
          id: '00000000-0000-0000-0000-000000000091',
          isSuspendable: false,
          url: 'https://calendly.com/app/admin/users',
        },
        {
          additionalEmails: [],
          displayName: 'name-2',
          email: 'user-2@foo.bar',
          role: 'user',
          id: '00000000-0000-0000-0000-000000000092',
          isSuspendable: true,
          url: 'https://calendly.com/app/admin/users',
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
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'name-0',
          email: 'user-0@foo.bar',
          role: 'owner',
          id: '00000000-0000-0000-0000-000000000090',
          isSuspendable: false,
          url: 'https://calendly.com/app/admin/users',
        },
        {
          additionalEmails: [],
          displayName: 'name-1',
          email: 'user-1@foo.bar',
          role: 'admin',
          id: '00000000-0000-0000-0000-000000000091',
          isSuspendable: false,
          url: 'https://calendly.com/app/admin/users',
        },
        {
          additionalEmails: [],
          displayName: 'name-2',
          email: 'user-2@foo.bar',
          role: 'user',
          id: '00000000-0000-0000-0000-000000000092',
          isSuspendable: true,
          url: 'https://calendly.com/app/admin/users',
        },
      ],
    });
    const syncBeforeAtISO = new Date(syncedBefore).toISOString();
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({ syncedBefore: syncBeforeAtISO });
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
