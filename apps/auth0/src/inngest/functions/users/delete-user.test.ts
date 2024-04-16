import { expect, test, describe, vi, beforeAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import * as authConnector from '@/connectors/auth';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { deleteAuth0User } from './delete-user';

const accessToken = 'access-token';
const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  domain: 'test-domain',
  audience: 'test-audience',
  region: 'us',
};

const userId = 'user-id';

const setup = createInngestFunctionMock(deleteAuth0User, 'auth0/users.delete.requested');

describe('delete-user-request', () => {
  beforeAll(() => {
    vi.spyOn(authConnector, 'getToken').mockResolvedValue({
      access_token: accessToken,
      expires_in: 'expiry-time',
      scope: 'scope',
      token_type: 'bearer',
    });

    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValue(undefined);
  });
  test('should abort request when organisation is not registered', async () => {
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      id: userId,
      organisationId: organisation.id,
    });

    // assert the function throws a NonRetriableError that will inform inngest to definitly cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
    expect(authConnector.getToken).toBeCalledTimes(0);
    expect(usersConnector.deleteUser).toBeCalledTimes(0);

    // check that the function is not sending other event
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the request when the organization is registered', async () => {
    // setup the test with an organisation
    await db.insert(Organisation).values(organisation);
    const [result] = setup({
      id: userId,
      organisationId: organisation.id,
    });

    await expect(result).resolves.toBeUndefined();
    expect(authConnector.getToken).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith(accessToken, organisation.domain, userId);
  });
});
