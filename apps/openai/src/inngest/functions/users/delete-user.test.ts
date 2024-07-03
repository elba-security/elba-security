import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/openai/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { deleteUser } from './delete-user';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  apiKey: 'test-api-key',
  organizationId: 'test-id',
  region: 'us',
};

const userId = 'user-id';

const setup = createInngestFunctionMock(deleteUser, 'openai/users.delete.requested');

describe('delete-user-request', () => {
  test('should abort when organisation is not registered', async () => {
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValue(undefined);
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result] = setup({
      userId,
      organisationId: organisation.id,
    });

    // assert the function throws a NonRetriableError that will inform inngest to definitly cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    // check that the function is not sending other event
    expect(usersConnector.deleteUser).toBeCalledTimes(0);
  });

  test('should delete the user when the organisation is registered', async () => {
    // setup the test with an organisation
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValue(undefined);
    const [result] = setup({
      userId,
      organisationId: organisation.id,
    });

    await expect(result).resolves.toBeUndefined();
    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith({
      userId,
      organizationId: organisation.organizationId,
      apiKey: organisation.apiKey,
    });
  });
});
