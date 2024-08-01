import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/elastic/users';
import * as organizationConnector from '@/connectors/elastic/organization';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { syncUsers } from './sync-users';

const apiKey = 'test-access-token';
const organizationId = 'test-organization-id';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  apiKey: await encrypt(apiKey),
  region: 'us',
};
const syncStartedAt = Date.now();
const syncedBefore = Date.now();
const users: usersConnector.ElasticUser[] = Array.from({ length: 2 }, (_, i) => ({
  user_id: `user-id-${i}`,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
  role_assignments: {
    organization: [{ role_id: 'test-role-id' }],
    deployment: null,
  },
}));

const setup = createInngestFunctionMock(syncUsers, 'elastic/users.sync.requested');

describe('synchronize-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(usersConnector, 'getAllUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(usersConnector.getAllUsers).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should finalize the sync', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(usersConnector, 'getAllUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
    });
    vi.spyOn(organizationConnector, 'getOrganizationId').mockResolvedValueOnce({ organizationId });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
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
          id: 'user-id-0',
          role: 'test role id',
          isSuspendable: true,
          url: 'https://cloud.elastic.co/account/members',
        },
        {
          additionalEmails: [],
          displayName: 'name-1',
          email: 'user-1@foo.bar',
          id: 'user-id-1',
          role: 'test role id',
          isSuspendable: true,
          url: 'https://cloud.elastic.co/account/members',
        },
      ],
    });
    const syncBeforeAtISO = new Date(syncedBefore).toISOString();
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({ syncedBefore: syncBeforeAtISO });
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
