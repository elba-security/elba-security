import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/clickup/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import * as crypto from '@/common/crypto';
import {z} from 'zod'
import { ClickupUserSchema } from '@/connectors/clickup/users';
import { env } from '@/common/env';
import { syncUsersPage } from './sync-users-page';

const region = 'us';
const accessToken = 'access-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  accessToken,
  region,
};
const validUsers: usersConnector.ClickUpUser[] = [
  {
    id: 'test-id',
    username: 'test-username',
    email: 'test-user-@foo.bar',
    role: 'test-role',
  },
];

const invalidUsers = [];

const elbaUsers = [
  {
    id: 'test-id',
    role: 'test-role',
    additionalEmails: [],
    authMethod: undefined,
    displayName: 'test-username',
    email: 'test-user-@foo.bar',
  },
];

const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(syncUsersPage, 'clickup/users.sync.requested');

describe('sync-users-page', () => {
  test('should abort sync when organisation is not registered', async () => {
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      organisationId: organisation.id,
      teamId: 'test-id',
    });
    // assert the function throws a NonRetriableError that will inform inngest to definitly cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    // check that the function is not sending other event
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should sync when organisation is registered', async () => {
    const elba = spyOnElba();

    await db.insert(Organisation).values(organisation);

    // @ts-expect-error -- this is a mock
    vi.spyOn(crypto, 'decrypt').mockResolvedValue(undefined);
    
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers,
      invalidUsers
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      teamId: 'test-id',
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith(organisation.accessToken);

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      organisationId: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
      region: 'us',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({ users: elbaUsers });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('clickup/users.sync.completed', {
      name: 'clickup/users.sync.completed',
      data: {
        organisationId: organisation.id,
        teamId: 'test-id',
      },
    });
  });
});
