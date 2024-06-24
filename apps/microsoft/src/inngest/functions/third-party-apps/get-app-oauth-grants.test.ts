import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as appsConnector from '@/connectors/microsoft/apps';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { getAppOauthGrants } from './get-app-oauth-grants';

const appId = 'app-id';
const token = 'some-token';
const pageSize = 10;
const oauthGrants = Array.from({ length: 100 }, (_, i) => ({
  id: `id-${i}`,
  principalId: `user-id-${i}`,
  // first space is not a typo, the API actually does that
  scope: ' scope-1 scope2 scope3',
}));

const organisation = {
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c90`,
  tenantId: `tenant-0`,
  region: 'us',
  token: await encrypt(token),
};

const setup = createInngestFunctionMock(
  getAppOauthGrants,
  'microsoft/third_party_apps.get_app_oauth_grants.requested'
);

describe('get-app-oauth-grants', () => {
  beforeEach(() => {
    /**
     * In this mock skipToken will be string of the top params (number) for convenience
     */
    vi.spyOn(appsConnector, 'getAppOauthGrants').mockImplementation((params) => {
      const top = params.skipToken ? Number(params.skipToken) : 0;
      return Promise.resolve({
        invalidAppOauthGrants: [],
        validAppOauthGrants: oauthGrants.slice(top, top + pageSize),
        nextSkipToken: top + pageSize >= oauthGrants.length ? null : `${top + pageSize}`,
      }) as ReturnType<typeof appsConnector.getAppOauthGrants>;
    });
  });
  test('should abort when the organisation cannot be retrieved', async () => {
    const [result, { step }] = setup({
      organisationId: organisation.id,
      appId,
      skipToken: null,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(appsConnector.getAppOauthGrants).toBeCalledTimes(0);
    expect(step.invoke).toBeCalledTimes(0);
  });

  test('should retrieve every oauth grants', async () => {
    await db.insert(organisationsTable).values(organisation);
    const [result] = setup({
      organisationId: organisation.id,
      appId,
      skipToken: null,
    });

    await expect(result).resolves.toStrictEqual(oauthGrants);
    const endpointCallsCount = Math.ceil(oauthGrants.length / pageSize);

    expect(appsConnector.getAppOauthGrants).toBeCalledTimes(endpointCallsCount);

    for (let i = 0; i < endpointCallsCount; i++) {
      expect(appsConnector.getAppOauthGrants).toHaveBeenNthCalledWith(i + 1, {
        token,
        tenantId: organisation.tenantId,
        appId,
        skipToken: i === 0 ? null : `${i * pageSize}`,
      });
    }
  });
});
