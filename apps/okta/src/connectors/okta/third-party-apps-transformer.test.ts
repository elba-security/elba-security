import { describe, expect, test, vi } from 'vitest';
import type { ThirdPartyAppsObject } from '@elba-security/sdk';
import { formatThirdPartyApps } from './third-party-apps-transformer';
import * as thirdPartyAppsModule from './third-party-apps';

const token = 'test-token';
const subDomain = 'test-subdomain';

describe('formatThirdPartyApps', () => {
  test('should format grants into third-party apps objects', async () => {
    const mockApp = {
      id: 'app-1',
      name: 'testapp',
      label: 'Test Application',
      status: 'ACTIVE' as const,
      created: '2023-01-01T00:00:00.000Z',
      _links: {
        self: {
          href: 'https://test-subdomain.okta.com/api/v1/apps/app-1',
        },
      },
    };

    vi.spyOn(thirdPartyAppsModule, 'getApplication').mockResolvedValue(mockApp);

    const grants = [
      {
        userId: 'user-1',
        grants: [
          {
            id: 'grant-1',
            status: 'ACTIVE' as const,
            created: '2023-11-15T10:00:00.000Z',
            lastUpdated: '2023-11-15T10:00:00.000Z',
            issuer: 'https://test-subdomain.okta.com',
            clientId: 'app-1',
            userId: 'user-1',
            scopeId: 'okta.users.read',
            source: 'ADMIN' as const,
          },
          {
            id: 'grant-2',
            status: 'ACTIVE' as const,
            created: '2023-11-15T10:00:00.000Z',
            lastUpdated: '2023-11-15T10:00:00.000Z',
            issuer: 'https://test-subdomain.okta.com',
            clientId: 'app-1',
            userId: 'user-1',
            scopeId: 'okta.users.manage',
            source: 'ADMIN' as const,
          },
        ],
      },
      {
        userId: 'user-2',
        grants: [
          {
            id: 'grant-3',
            status: 'ACTIVE' as const,
            created: '2023-11-16T10:00:00.000Z',
            lastUpdated: '2023-11-16T10:00:00.000Z',
            issuer: 'https://test-subdomain.okta.com',
            clientId: 'app-1',
            userId: 'user-2',
            scopeId: 'okta.users.read',
            source: 'USER' as const,
          },
        ],
      },
    ];

    const result = await formatThirdPartyApps({
      grants,
      token,
      subDomain,
    });

    const expected: ThirdPartyAppsObject[] = [
      {
        id: 'app-1',
        name: 'Test Application',
        url: 'https://test-subdomain.okta.com/api/v1/apps/app-1',
        users: [
          {
            id: 'user-1',
            scopes: ['okta.users.read', 'okta.users.manage'],
            createdAt: '2023-11-15T10:00:00.000Z',
          },
          {
            id: 'user-2',
            scopes: ['okta.users.read'],
            createdAt: '2023-11-16T10:00:00.000Z',
          },
        ],
      },
    ];

    expect(result).toStrictEqual(expected);
  });

  test('should handle missing app details gracefully', async () => {
    vi.spyOn(thirdPartyAppsModule, 'getApplication').mockRejectedValue(new Error('App not found'));

    const grants = [
      {
        userId: 'user-1',
        grants: [
          {
            id: 'grant-1',
            status: 'ACTIVE' as const,
            created: '2023-11-15T10:00:00.000Z',
            lastUpdated: '2023-11-15T10:00:00.000Z',
            issuer: 'https://test-subdomain.okta.com',
            clientId: 'app-unknown',
            userId: 'user-1',
            scopeId: 'okta.users.read',
            source: 'ADMIN' as const,
            _links: {
              client: {
                href: 'https://test-subdomain.okta.com/api/v1/apps/app-unknown',
                title: 'Unknown App',
              },
            },
          },
        ],
      },
    ];

    const result = await formatThirdPartyApps({
      grants,
      token,
      subDomain,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toStrictEqual({
      id: 'app-unknown',
      name: 'Unknown App',
      url: 'https://test-subdomain.okta.com/api/v1/apps/app-unknown',
      users: [
        {
          id: 'user-1',
          scopes: ['okta.users.read'],
          createdAt: '2023-11-15T10:00:00.000Z',
        },
      ],
    });
  });

  test('should handle multiple apps', async () => {
    const mockApp1 = {
      id: 'app-1',
      name: 'app1',
      label: 'App One',
      status: 'ACTIVE' as const,
      created: '2023-01-01T00:00:00.000Z',
      _links: {
        self: {
          href: 'https://test-subdomain.okta.com/api/v1/apps/app-1',
        },
      },
    };

    const mockApp2 = {
      id: 'app-2',
      name: 'app2',
      label: 'App Two',
      status: 'ACTIVE' as const,
      created: '2023-01-01T00:00:00.000Z',
      _links: {
        self: {
          href: 'https://test-subdomain.okta.com/api/v1/apps/app-2',
        },
      },
    };

    vi.spyOn(thirdPartyAppsModule, 'getApplication').mockImplementation(({ appId }) => {
      if (appId === 'app-1') return Promise.resolve(mockApp1);
      if (appId === 'app-2') return Promise.resolve(mockApp2);
      throw new Error('App not found');
    });

    const grants = [
      {
        userId: 'user-1',
        grants: [
          {
            id: 'grant-1',
            status: 'ACTIVE' as const,
            created: '2023-11-15T10:00:00.000Z',
            lastUpdated: '2023-11-15T10:00:00.000Z',
            issuer: 'https://test-subdomain.okta.com',
            clientId: 'app-1',
            userId: 'user-1',
            scopeId: 'okta.users.read',
            source: 'ADMIN' as const,
          },
          {
            id: 'grant-2',
            status: 'ACTIVE' as const,
            created: '2023-11-15T11:00:00.000Z',
            lastUpdated: '2023-11-15T11:00:00.000Z',
            issuer: 'https://test-subdomain.okta.com',
            clientId: 'app-2',
            userId: 'user-1',
            scopeId: 'okta.apps.read',
            source: 'USER' as const,
          },
        ],
      },
    ];

    const result = await formatThirdPartyApps({
      grants,
      token,
      subDomain,
    });

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      id: 'app-1',
      name: 'App One',
      url: 'https://test-subdomain.okta.com/api/v1/apps/app-1',
      users: [
        {
          id: 'user-1',
          scopes: ['okta.users.read'],
          createdAt: '2023-11-15T10:00:00.000Z',
        },
      ],
    });
    expect(result).toContainEqual({
      id: 'app-2',
      name: 'App Two',
      url: 'https://test-subdomain.okta.com/api/v1/apps/app-2',
      users: [
        {
          id: 'user-1',
          scopes: ['okta.apps.read'],
          createdAt: '2023-11-15T11:00:00.000Z',
        },
      ],
    });
  });

  test('should return empty array when no grants provided', async () => {
    const result = await formatThirdPartyApps({
      grants: [],
      token,
      subDomain,
    });

    expect(result).toStrictEqual([]);
  });
});
