import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as appsConnector from '@/connectors/microsoft/apps';
import { encrypt } from '@/common/crypto';
import { env } from '@/env';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { syncApps } from './sync-apps';
import { getAppOauthGrants } from './get-app-oauth-grants';

const token = 'test-token';
const encryptedToken = await encrypt(token);
const syncStartedAt = Date.now();

const organisation = {
  id: '973b95c5-5dc2-44e8-8ed6-a4ff91a7cf8d',
  tenantId: 'tenantId',
  region: 'us',
  token: encryptedToken,
};

const oauthGrants = [
  {
    id: 'grant-id-1-1',
    principalId: 'principal-id',
    // first space is not a typo, the API actually does that
    scope: ' scope-1 scope2 scope3',
  },
  {
    id: 'grant-id-1-2',
    principalId: 'principal-id',
    scope: ' scope3 scope4 scope5',
  },
  {
    id: 'grant-id-2-1',
    principalId: 'principal-id-2',
    scope: ' scope3 scope4 scope5',
  },
];

const setup = createInngestFunctionMock(syncApps, 'microsoft/third_party_apps.sync.requested');

const apps = [
  {
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
      {
        id: 'role-id-2',
        principalId: 'principal-id-2',
      },
    ],
  },
];

const data = {
  organisationId: organisation.id,
  syncStartedAt,
  isFirstSync: true,
  skipToken: null,
};

describe('sync-apps', () => {
  test('should abort sync when organisation is not registered', async () => {
    const nextSkipToken = 'nextSkipToken';
    const elba = spyOnElba();
    const getApps = vi.spyOn(appsConnector, 'getApps').mockResolvedValue({
      invalidApps: [],
      validApps: apps,
      nextSkipToken,
    });
    const [result, { step }] = setup(data);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(elba).toBeCalledTimes(0);
    expect(step.invoke).toBeCalledTimes(0);
    expect(getApps).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    await db.insert(organisationsTable).values(organisation);

    const nextSkipToken = 'nextSkipToken';
    const elba = spyOnElba();
    const getApps = vi.spyOn(appsConnector, 'getApps').mockResolvedValue({
      invalidApps: [],
      validApps: apps,
      nextSkipToken,
    });
    const [result, { step }] = setup(data);

    step.invoke.mockResolvedValue(oauthGrants);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(step.invoke).toBeCalledTimes(apps.length);
    for (let i = 0; i < apps.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- testing convenience
      const app = apps[i]!;
      expect(step.invoke).toHaveBeenNthCalledWith(i + 1, `get-app-oauth-grants-${app.id}`, {
        function: getAppOauthGrants,
        data: {
          organisationId: organisation.id,
          appId: app.id,
          skipToken: null,
        },
      });
    }
    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

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
                oauthGrantIds: ['grant-id-1-1', 'grant-id-1-2'],
              },
              scopes: ['scope-1', 'scope2', 'scope3', 'scope4', 'scope5'],
            },
            {
              id: 'principal-id-2',
              metadata: {
                permissionId: 'role-id-2',
                oauthGrantIds: ['grant-id-2-1'],
              },
              scopes: ['scope3', 'scope4', 'scope5'],
            },
          ],
        },
      ],
    });

    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(0);

    expect(getApps).toBeCalledTimes(1);
    expect(getApps).toBeCalledWith({
      token,
      tenantId: organisation.tenantId,
      skipToken: data.skipToken,
    });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-next-apps-page', {
      name: 'microsoft/third_party_apps.sync.requested',
      data: { ...data, skipToken: nextSkipToken },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    await db.insert(organisationsTable).values(organisation);

    const nextSkipToken = null;
    const elba = spyOnElba();
    const getApps = vi.spyOn(appsConnector, 'getApps').mockResolvedValue({
      invalidApps: [],
      validApps: apps,
      nextSkipToken,
    });
    const [result, { step }] = setup(data);

    step.invoke.mockResolvedValue(oauthGrants);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

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
                oauthGrantIds: ['grant-id-1-1', 'grant-id-1-2'],
              },
              scopes: ['scope-1', 'scope2', 'scope3', 'scope4', 'scope5'],
            },
            {
              id: 'principal-id-2',
              metadata: {
                permissionId: 'role-id-2',
                oauthGrantIds: ['grant-id-2-1'],
              },
              scopes: ['scope3', 'scope4', 'scope5'],
            },
          ],
        },
      ],
    });

    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledWith({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });

    expect(getApps).toBeCalledTimes(1);
    expect(getApps).toBeCalledWith({
      token,
      tenantId: organisation.tenantId,
      skipToken: data.skipToken,
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
