import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/webflow/users';
import { db } from '@/database/client';
import * as sitesConnector from '@/connectors/webflow/sites';
import { organisationsTable } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { deleteUsers } from './delete-user';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: 'access-token',
  region: 'us',
};

const siteIds = ['test-id'];
const userId = 'user-id';

const setup = createInngestFunctionMock(deleteUsers, 'webflow/users.delete.requested');

describe('delete-user-request', () => {
  test('should abort request when organisation is not registered', async () => {
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValue(undefined);

    const [result, { step }] = setup({
      userId,
      organisationId: organisation.id,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(usersConnector.deleteUser).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the request when the organization is registered', async () => {
    await db.insert(organisationsTable).values(organisation);

    vi.spyOn(sitesConnector, 'getSiteIds').mockResolvedValue(siteIds);

    vi.spyOn(crypto, 'decrypt').mockResolvedValue(organisation.accessToken);

    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValue(undefined);
    const [result] = setup({
      userId,
      organisationId: organisation.id,
    });

    await expect(result).resolves.toBeUndefined();

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith(organisation.accessToken);

    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    siteIds.forEach((siteId) => {
      expect(usersConnector.deleteUser).toBeCalledWith(organisation.accessToken, siteId, userId);
    });
  });
});
