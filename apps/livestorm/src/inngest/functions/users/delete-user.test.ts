import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/livestorm/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { deleteUser } from './delete-user';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  token: 'test-token',
  region: 'us',
};
const userId = 'user-id';
const setup = createInngestFunctionMock(deleteUser, 'livestorm/users.delete.requested');

describe('delete-user-request', () => {
  test('should abort request when organisation is not registered', async () => {
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValue(undefined);
    const [result, { step }] = setup({
      userId,
      organisationId: organisation.id,
    });
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
    expect(usersConnector.deleteUser).toBeCalledTimes(0);
    // check that the function is not sending other event
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the request when the organization is registered', async () => {
    // setup the test with an organisation
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(crypto, 'decrypt').mockResolvedValue(organisation.token);
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValue(undefined);
    const [result] = setup({
      userId,
      organisationId: organisation.id,
    });
    await expect(result).resolves.toBeUndefined();

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith(organisation.token);

    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith({
      token: 'test-token',
      userId: 'user-id',
    });
  });
});
