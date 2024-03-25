import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { deleteApolloUser } from './delete.user';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: 'test-token',
  region: 'us',
};
const userId = 'user-id';
const setup = createInngestFunctionMock(deleteApolloUser, 'apollo/users.delete.requested');

describe('delete-user-request', () => {
  test('should abort request when organisation is not registered', async () => {
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValue(undefined);
    const [result, { step }] = setup({
      id: userId,
      organisationId: organisation.id,
      region: organisation.region,
    });

    // assert the function throws a NonRetriableError that will inform inngest to definitly cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(usersConnector.deleteUser).toBeCalledTimes(0);
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
      region: organisation.region,
    });

    await expect(result).resolves.toBeUndefined();
    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith(organisation.token, userId);
  });
});
