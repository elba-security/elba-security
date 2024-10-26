import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/clickup/users';
import { db } from '@/database/client';
import * as crypto from '@/common/crypto';
import { env } from '@/common/env';
import { organisationsTable } from '@/database/schema';
import { syncUsers } from './sync-users';

const region = 'us';
const accessToken = 'access-token';
const organisationId = '00000000-0000-0000-0000-000000000001';
const teamId = 'test-id';

const organisation = {
  id: organisationId,
  accessToken,
  teamId,
  region,
};
const validUsers: usersConnector.ClickUpUser[] = [
  {
    id: 10,
    username: 'test-username',
    email: 'test-user-@foo.bar',
    role: 'test-role',
  },
];

const invalidUsers = [];

const elbaUsers = [
  {
    id: '10',
    role: 'test-role',
    additionalEmails: [],
    authMethod: undefined,
    displayName: 'test-username',
    email: 'test-user-@foo.bar',
    isSuspendable: true,
    url: 'https://app.clickup.com/test-id/settings/team/test-id/users',
  },
];

const setup = createInngestFunctionMock(syncUsers, 'clickup/users.sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    const [result, { step }] = setup({
      organisationId: organisation.id,
      syncStartedAt: new Date().getTime(),
      isFirstSync: false,
    });
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should sync when organisation is registered', async () => {
    const elba = spyOnElba();

    await db.insert(organisationsTable).values(organisation);

    // @ts-expect-error -- this is a mock
    vi.spyOn(crypto, 'decrypt').mockResolvedValue(undefined);

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers,
      invalidUsers,
    });
    const [result] = setup({
      organisationId: organisation.id,
      syncStartedAt: new Date().getTime(),
      isFirstSync: false,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith(organisation.accessToken);

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      organisationId,
      region: 'us',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({ users: elbaUsers });
  });
});
