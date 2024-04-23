import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/openai/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { syncUsers } from './sync-users-page';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  apiKey: 'test-api-key',
  organizationId: 'test-id',
  region: 'us',
};

export const users = Array.from({ length: 10 }, (_, i) => ({
  role: 'admin',
  user: { id: `userId-${i}`, name: `username-${i}`, email: `username-${i}@foo.bar` },
}));

const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(syncUsers, 'openai/users.sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    const elba = spyOnElba();
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      users,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(step.sendEvent).toBeCalledTimes(0);
    expect(usersConnector.getUsers).toBeCalledTimes(0);
    expect(elba).toBeCalledTimes(0);
  });

  test('should sync the users when the organization is registered', async () => {
    const elba = spyOnElba();

    await db.insert(organisationsTable).values(organisation);

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      users,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
    });

    await expect(result).resolves.toBeUndefined();

    expect(step.sendEvent).toBeCalledTimes(0);
    expect(usersConnector.getUsers).toBeCalledTimes(1);
    expect(usersConnector.getUsers).toBeCalledWith({
      apiKey: organisation.apiKey,
      organizationId: organisation.organizationId,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: env.ELBA_API_KEY,
      organisationId: organisation.id,
      region: organisation.region,
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: users.map((user) => ({
        id: user.user.id,
        displayName: user.user.name,
        email: user.user.email,
        role: user.role,
        additionalEmails: [],
      })),
    });

    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });
  });
});
