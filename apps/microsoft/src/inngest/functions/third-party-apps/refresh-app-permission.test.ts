import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as appsConnector from '@/connectors/microsoft/apps';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { env } from '@/env';
import { refreshAppPermission } from './refresh-app-permission';

const appId = 'app-id';
const userId = 'user-id';
const token = 'some-token';

const organisation = {
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c90`,
  tenantId: `tenant-0`,
  region: 'us',
  token: await encrypt(token),
};

const app = {
  appDisplayName: 'elba test',
  description: 'some description',
  id: 'some-app-id',
  homepage: 'https://foo.bar',
  info: {
    logoUrl: 'https://foo.bar/logo.png',
  },
  verifiedPublisher: { displayName: 'foo' },
  oauth2PermissionScopes: [],
  appRoleAssignedTo: [
    {
      id: 'role-id',
      principalId: 'principal-id',
    },
  ],
};

const setup = createInngestFunctionMock(
  refreshAppPermission,
  'microsoft/third_party_apps.refresh_app_permission.requested'
);

describe('refresh-app-permission', () => {
  test('should abort when the organisation cannot be retrieved', async () => {
    const elba = spyOnElba();
    const getApp = vi.spyOn(appsConnector, 'getApp').mockResolvedValue(app);
    const [result] = setup({
      organisationId: organisation.id,
      appId,
      userId,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(getApp).toBeCalledTimes(0);
    expect(elba).toBeCalledTimes(0);
  });

  test('should delete app user permission on elba when the app does not exists', async () => {
    await db.insert(organisationsTable).values(organisation);
    const elba = spyOnElba();
    const getApp = vi.spyOn(appsConnector, 'getApp').mockResolvedValue(null);
    const [result] = setup({
      organisationId: organisation.id,
      appId,
      userId,
    });

    await expect(result).resolves.toBeUndefined();

    expect(getApp).toBeCalledTimes(1);
    expect(getApp).toBeCalledWith({
      tenantId: organisation.tenantId,
      token,
      appId,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(0);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledWith({
      ids: [{ appId, userId }],
    });
  });

  test('should update the app on elba when the app does exists', async () => {
    await db.insert(organisationsTable).values(organisation);
    const elba = spyOnElba();
    const getApp = vi.spyOn(appsConnector, 'getApp').mockResolvedValue(app);
    const [result] = setup({
      organisationId: organisation.id,
      appId,
      userId,
    });

    await expect(result).resolves.toBeUndefined();

    expect(getApp).toBeCalledTimes(1);
    expect(getApp).toBeCalledWith({
      tenantId: organisation.tenantId,
      token,
      appId,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(0);
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledWith({
      apps: [
        {
          description: 'some description',
          id: 'some-app-id',
          logoUrl: 'https://foo.bar/logo.png',
          name: 'elba test',
          publisherName: 'foo',
          url: 'https://foo.bar',
          users: [
            {
              id: 'principal-id',
              metadata: {
                permissionId: 'role-id',
              },
              scopes: [],
            },
          ],
        },
      ],
    });
  });
});
