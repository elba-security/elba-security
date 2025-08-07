import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/okta/users';
import * as thirdPartyAppsConnector from '@/connectors/okta/third-party-apps';
import * as thirdPartyAppsTransformer from '@/connectors/okta/third-party-apps-transformer';
import * as nangoAPIClient from '@/common/nango';
import { syncThirdPartyApps } from './sync-third-party-apps';

const organisationId = '00000000-0000-0000-0000-000000000001';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const syncStartedAt = new Date().toISOString();

const validUsers: usersConnector.OktaUser[] = [
  {
    id: 'user-1',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
  },
  {
    id: 'user-2',
    profile: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    },
  },
];

const grants: thirdPartyAppsConnector.OktaGrant[] = [
  {
    id: 'grant-1',
    status: 'ACTIVE',
    created: '2023-11-15T10:00:00.000Z',
    lastUpdated: '2023-11-15T10:00:00.000Z',
    issuer: 'https://test-subdomain.okta.com',
    clientId: 'app-1',
    userId: 'user-1',
    scopeId: 'okta.users.read',
    source: 'ADMIN',
  },
];

const formattedApps = [
  {
    id: 'app-1',
    name: 'Test App',
    url: 'https://test-subdomain.okta.com/api/v1/apps/app-1',
    users: [
      {
        id: 'user-1',
        scopes: ['okta.users.read'],
        createdAt: '2023-11-15T10:00:00.000Z',
      },
    ],
  },
];

const setup = createInngestFunctionMock(syncThirdPartyApps, 'okta/third_party_apps.sync.requested');

describe('sync-third-party-apps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should sync third-party apps successfully', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
        connection_config: {
          subdomain: 'test-subdomain',
        },
      }),
    }));

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValueOnce({
      validUsers,
      invalidUsers: [],
      nextPage: null,
    });

    vi.spyOn(thirdPartyAppsConnector, 'getGrantsForUsers').mockResolvedValue([
      { userId: 'user-1', grants },
      { userId: 'user-2', grants: [] },
    ]);

    vi.spyOn(thirdPartyAppsTransformer, 'formatThirdPartyApps').mockResolvedValue(formattedApps);

    const [result, { step }] = setup({
      region,
      organisationId,
      nangoConnectionId,
      syncStartedAt,
      isFirstSync: false,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    // Verify that the sync function was called
    expect(step.run).toHaveBeenCalledWith('sync-third-party-apps', expect.any(Function));

    // Verify the API calls
    expect(usersConnector.getUsers).toHaveBeenCalledWith({
      token: 'access-token',
      subDomain: 'test-subdomain',
      page: null,
    });

    expect(thirdPartyAppsConnector.getGrantsForUsers).toHaveBeenCalledWith({
      token: 'access-token',
      subDomain: 'test-subdomain',
      users: validUsers,
      concurrency: 5,
    });

    expect(thirdPartyAppsTransformer.formatThirdPartyApps).toHaveBeenCalledWith({
      grants: [{ userId: 'user-1', grants }],
      token: 'access-token',
      subDomain: 'test-subdomain',
    });
  });

  test('should handle users with no grants', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
        connection_config: {
          subdomain: 'test-subdomain',
        },
      }),
    }));

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValueOnce({
      validUsers,
      invalidUsers: [],
      nextPage: null,
    });

    vi.spyOn(thirdPartyAppsConnector, 'getGrantsForUsers').mockResolvedValue([
      { userId: 'user-1', grants: [] },
      { userId: 'user-2', grants: [] },
    ]);

    const [result] = setup({
      region,
      organisationId,
      nangoConnectionId,
      syncStartedAt,
      isFirstSync: false,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    // Verify that formatThirdPartyApps was not called when no grants
    expect(thirdPartyAppsTransformer.formatThirdPartyApps).not.toHaveBeenCalled();
  });

  test('should handle pagination for users', async () => {
    const firstPageUsers = validUsers[0] ? [validUsers[0]] : [];
    const secondPageUsers = validUsers[1] ? [validUsers[1]] : [];

    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
        connection_config: {
          subdomain: 'test-subdomain',
        },
      }),
    }));

    vi.spyOn(usersConnector, 'getUsers')
      .mockResolvedValueOnce({
        validUsers: firstPageUsers,
        invalidUsers: [],
        nextPage: 'page-2',
      })
      .mockResolvedValueOnce({
        validUsers: secondPageUsers,
        invalidUsers: [],
        nextPage: null,
      });

    vi.spyOn(thirdPartyAppsConnector, 'getGrantsForUsers').mockResolvedValue([
      { userId: 'user-1', grants },
      { userId: 'user-2', grants: [] },
    ]);

    vi.spyOn(thirdPartyAppsTransformer, 'formatThirdPartyApps').mockResolvedValue(formattedApps);

    const [result] = setup({
      region,
      organisationId,
      nangoConnectionId,
      syncStartedAt,
      isFirstSync: false,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(usersConnector.getUsers).toHaveBeenCalledTimes(2);
    expect(usersConnector.getUsers).toHaveBeenCalledWith({
      token: 'access-token',
      subDomain: 'test-subdomain',
      page: null,
    });
    expect(usersConnector.getUsers).toHaveBeenCalledWith({
      token: 'access-token',
      subDomain: 'test-subdomain',
      page: 'page-2',
    });
  });
});
