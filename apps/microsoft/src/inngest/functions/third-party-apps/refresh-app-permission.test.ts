import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as appsConnector from '@/connectors/microsoft/apps';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { env } from '@/env';
import { refreshAppPermission } from './refresh-app-permission';
import { getAppOauthGrants } from './get-app-oauth-grants';

const appId = 'app-id';
const userId = 'user-id';
const token = 'some-token';

const organisation = {
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c90`,
  tenantId: `tenant-0`,
  region: 'us',
  token: await encrypt(token),
};

const oauthGrants = [
  {
    id: 'grant-id-1',
    principalId: 'principal-id',
    // first space is not a typo, the API actually does that
    scope: ' scope-1 scope2 scope3',
  },
  {
    id: 'grant-id-2',
    principalId: 'principal-id',
    scope: ' scope3 scope4 scope5',
  },
];

const app = {
  appDisplayName: 'elba test',
  description: 'some description',
  id: appId,
  homepage: 'https://foo.bar',
  info: {
    logoUrl: 'https://foo.bar/logo.png',
  },
  verifiedPublisher: { displayName: 'foo' },
  oauth2PermissionScopes: ['app-permission-scope-1', 'app-permission-scope-2'],
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
    const [result, { step }] = setup({
      organisationId: organisation.id,
      appId,
      userId,
    });
    step.invoke.mockResolvedValue([]);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(getApp).toBeCalledTimes(0);
    expect(step.invoke).toBeCalledTimes(0);
    expect(elba).toBeCalledTimes(0);
  });

  test('should delete app user on elba when the app does not exists', async () => {
    await db.insert(organisationsTable).values(organisation);
    const elba = spyOnElba();
    const getApp = vi.spyOn(appsConnector, 'getApp').mockResolvedValue(null);
    const [result, { step }] = setup({
      organisationId: organisation.id,
      appId,
      userId,
    });
    step.invoke.mockResolvedValue([]);

    await expect(result).resolves.toMatchObject({ status: 'deleted' });

    expect(getApp).toBeCalledTimes(1);
    expect(getApp).toBeCalledWith({
      tenantId: organisation.tenantId,
      token,
      appId,
    });
    expect(step.invoke).toBeCalledTimes(0);

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

  test('should delete app user on elba when the user does not have any permissions or grants on the app', async () => {
    await db.insert(organisationsTable).values(organisation);
    const elba = spyOnElba();
    const getApp = vi.spyOn(appsConnector, 'getApp').mockResolvedValue(app);
    const [result, { step }] = setup({
      organisationId: organisation.id,
      appId,
      userId,
    });
    step.invoke.mockResolvedValue(oauthGrants);

    await expect(result).resolves.toMatchObject({ status: 'deleted' });

    expect(getApp).toBeCalledTimes(1);
    expect(getApp).toBeCalledWith({
      tenantId: organisation.tenantId,
      token,
      appId,
    });

    expect(step.invoke).toBeCalledTimes(1);
    expect(step.invoke).toBeCalledWith('get-app-oauth-grants', {
      function: getAppOauthGrants,
      data: {
        organisationId: organisation.id,
        appId,
        skipToken: null,
      },
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledWith({ ids: [{ appId, userId }] });
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(0);
  });

  test('should update app user on elba when the user have an app permission but no grants on the app', async () => {
    await db.insert(organisationsTable).values(organisation);
    const elba = spyOnElba();
    const getApp = vi.spyOn(appsConnector, 'getApp').mockResolvedValue(app);
    const [result, { step }] = setup({
      organisationId: organisation.id,
      appId,
      userId: 'principal-id',
    });
    step.invoke.mockResolvedValue([]);

    await expect(result).resolves.toMatchObject({ status: 'updated' });

    expect(getApp).toBeCalledTimes(1);
    expect(getApp).toBeCalledWith({
      tenantId: organisation.tenantId,
      token,
      appId,
    });

    expect(step.invoke).toBeCalledTimes(1);
    expect(step.invoke).toBeCalledWith('get-app-oauth-grants', {
      function: getAppOauthGrants,
      data: {
        organisationId: organisation.id,
        appId,
        skipToken: null,
      },
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
          id: 'app-id',
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
              scopes: ['app-permission-scope-1', 'app-permission-scope-2'],
            },
          ],
        },
      ],
    });
  });

  test('should update app user on elba when the user have no app permissions but have grants on the app', async () => {
    await db.insert(organisationsTable).values(organisation);
    const elba = spyOnElba();
    const getApp = vi
      .spyOn(appsConnector, 'getApp')
      .mockResolvedValue({ ...app, appRoleAssignedTo: [] });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      appId,
      userId: 'principal-id',
    });
    step.invoke.mockResolvedValue(oauthGrants);

    await expect(result).resolves.toMatchObject({ status: 'updated' });

    expect(getApp).toBeCalledTimes(1);
    expect(getApp).toBeCalledWith({
      tenantId: organisation.tenantId,
      token,
      appId,
    });

    expect(step.invoke).toBeCalledTimes(1);
    expect(step.invoke).toBeCalledWith('get-app-oauth-grants', {
      function: getAppOauthGrants,
      data: {
        organisationId: organisation.id,
        appId,
        skipToken: null,
      },
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
          id: 'app-id',
          logoUrl: 'https://foo.bar/logo.png',
          name: 'elba test',
          publisherName: 'foo',
          url: 'https://foo.bar',
          users: [
            {
              id: 'principal-id',
              metadata: {
                oauthGrantIds: ['grant-id-1', 'grant-id-2'],
              },
              scopes: ['scope-1', 'scope2', 'scope3', 'scope4', 'scope5'],
            },
          ],
        },
      ],
    });
  });

  test('should update app user on elba when the user have app permissions and grants on the app', async () => {
    await db.insert(organisationsTable).values(organisation);
    const elba = spyOnElba();
    const getApp = vi.spyOn(appsConnector, 'getApp').mockResolvedValue(app);
    const [result, { step }] = setup({
      organisationId: organisation.id,
      appId,
      userId: 'principal-id',
    });
    step.invoke.mockResolvedValue(oauthGrants);

    await expect(result).resolves.toMatchObject({ status: 'updated' });

    expect(getApp).toBeCalledTimes(1);
    expect(getApp).toBeCalledWith({
      tenantId: organisation.tenantId,
      token,
      appId,
    });

    expect(step.invoke).toBeCalledTimes(1);
    expect(step.invoke).toBeCalledWith('get-app-oauth-grants', {
      function: getAppOauthGrants,
      data: {
        organisationId: organisation.id,
        appId,
        skipToken: null,
      },
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
          id: 'app-id',
          logoUrl: 'https://foo.bar/logo.png',
          name: 'elba test',
          publisherName: 'foo',
          url: 'https://foo.bar',
          users: [
            {
              id: 'principal-id',
              metadata: {
                oauthGrantIds: ['grant-id-1', 'grant-id-2'],
                permissionId: 'role-id',
              },
              scopes: [
                'app-permission-scope-1',
                'app-permission-scope-2',
                'scope-1',
                'scope2',
                'scope3',
                'scope4',
                'scope5',
              ],
            },
          ],
        },
      ],
    });
  });
});
