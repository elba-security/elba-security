import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { deleteHerokuUser } from './delete-user';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  teamId: 'team-id',
  region: 'us',
};

const userId = 'user-id';

const setup = createInngestFunctionMock(deleteHerokuUser, 'heroku/users.delete.requested');

describe('delete-user-request', () => {
  test('should abort request when organisation is not registered', async () => {
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      id: userId,
      organisationId: organisation.id,
    });

    // assert the function throws a NonRetriableError that will inform inngest to definitly cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    // check that the function is not sending other event
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the request when the organization is registered', async () => {
    // setup the test with an organisation
    await db.insert(Organisation).values(organisation);
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValue(undefined);
    const [result] = setup({
      id: userId,
      organisationId: organisation.id,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
  });
});
