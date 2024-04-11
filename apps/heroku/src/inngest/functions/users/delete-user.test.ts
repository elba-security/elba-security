import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { organisationsTable, teamUsersTable } from '@/database/schema';
import { deleteHerokuUser } from './delete-user';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  teamId: 'team-id',
  region: 'us',
};

const userId = 'user-id';

const teamUsers = Array.from({ length: 5 }, (_, i) => ({
  organisationId: organisation.id,
  userId,
  teamId: `team-${i}`,
}));

const setup = createInngestFunctionMock(deleteHerokuUser, 'heroku/users.delete.requested');

describe('delete-user-request', () => {
  test('should abort request when organisation is not registered', async () => {
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValue(undefined);
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      id: userId,
      organisationId: organisation.id,
    });

    // assert the function throws a NonRetriableError that will inform inngest to definitly cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(usersConnector.deleteUser).toBeCalledTimes(0);

    // check that the function is not sending other event
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should delete the user when the organization is registered', async () => {
    // setup the test with an organisation
    await db.insert(organisationsTable).values(organisation);
    await db.insert(teamUsersTable).values(teamUsers);
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValue(undefined);
    const [result] = setup({
      id: userId,
      organisationId: organisation.id,
    });

    await expect(result).resolves.toBeUndefined();
    expect(usersConnector.deleteUser).toBeCalledTimes(teamUsers.length);
    for (let i = 0; i < teamUsers.length; i++) {
      expect(usersConnector.deleteUser).toHaveBeenNthCalledWith(
        i + 1,
        organisation.accessToken,
        teamUsers.at(i)?.teamId,
        teamUsers.at(i)?.userId
      );
    }
  });
});
