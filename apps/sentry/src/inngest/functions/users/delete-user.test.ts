import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { deleteSentryUser } from './delete-user';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: 'test-token',
  organizationSlug: 'test-id',
  region: 'us',
};

const userId = 'user-id';
const setup = createInngestFunctionMock(deleteSentryUser, 'sentry/users.delete.requested');
describe('delete-user-request', () => {
  test('should abort request when organisation is not registered', async () => {
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValue(undefined);
    const [result, { step }] = setup({
      id: userId,
      organisationId: organisation.id,
      region: organisation.region,
    });
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
    expect(usersConnector.deleteUser).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });
  test('should continue the request when the organization is registered', async () => {
    await db.insert(Organisation).values(organisation);
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValue(undefined);
    const [result] = setup({
      id: userId,
      organisationId: organisation.id,
      region: organisation.region,
    });
    await expect(result).resolves.toBeUndefined();
    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith(
      organisation.token,
      organisation.organizationSlug,
      userId
    );
  });
});
