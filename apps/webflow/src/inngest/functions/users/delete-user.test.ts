import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/webflow/users';
import { db } from '@/database/client';
import * as sitesConnector from '@/connectors/webflow/sites';
import { Organisation } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { deleteWebflowUser } from './delete-user';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  accessToken: 'access-token',
  region: 'us',
};

const siteIds = ['test-id'];
const userIds = ['user-id'];

const setup = createInngestFunctionMock(deleteWebflowUser, 'webflow/users.delete.requested');

describe('delete-user-request', () => {
  test('should abort request when organisation is not registered', async () => {
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValue(undefined);
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      ids: userIds,
      organisationId: organisation.id,
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

    vi.spyOn(sitesConnector, 'getSiteIds').mockResolvedValue(siteIds);

    vi.spyOn(crypto, 'decrypt').mockResolvedValue(organisation.accessToken);

    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValue(undefined);
    const [result] = setup({
      ids: userIds,
      organisationId: organisation.id,
    });

    await expect(result).resolves.toBeUndefined();

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith(organisation.accessToken);

    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    siteIds.forEach((siteId) => {
      userIds.forEach((userId) => {
        expect(usersConnector.deleteUser).toBeCalledWith(
          organisation.accessToken,
          siteId,
          userId
        );
      });
    })
  });
});
