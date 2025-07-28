import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { OktaError } from '../common/error';
import {
  getGrantsForUser,
  getApplication,
  revokeGrant,
  getGrantsForUsers,
  type OktaGrant,
  type OktaApplication,
} from './third-party-apps';

const validToken = 'token-1234';
const subDomain = 'test-subdomain';
const userId = 'user-123';
const appId = 'app-456';
const grantId = 'grant-789';

const validGrants: OktaGrant[] = [
  {
    id: 'grant-789',
    status: 'ACTIVE',
    created: '2023-11-15T10:23:45.000Z',
    lastUpdated: '2023-11-15T10:23:45.000Z',
    issuer: 'https://test-subdomain.okta.com',
    clientId: 'app-456',
    userId: 'user-123',
    scopeId: 'okta.users.read',
    source: 'ADMIN',
    _links: {
      client: {
        href: 'https://test-subdomain.okta.com/api/v1/apps/app-456',
        title: 'Test App',
      },
      self: {
        href: 'https://test-subdomain.okta.com/api/v1/users/user-123/grants/grant-789',
      },
      user: {
        href: 'https://test-subdomain.okta.com/api/v1/users/user-123',
      },
    },
  },
];

const validApplication: OktaApplication = {
  id: 'app-456',
  name: 'testapp',
  label: 'Test Application',
  status: 'ACTIVE',
  created: '2023-01-01T00:00:00.000Z',
  _links: {
    self: {
      href: 'https://test-subdomain.okta.com/api/v1/apps/app-456',
    },
  },
};

describe('getGrantsForUser', () => {
  beforeEach(() => {
    server.use(
      http.get(`https://${subDomain}.okta.com/api/v1/users/${userId}/grants`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return Response.json(validGrants);
      })
    );
  });

  test('should return grants when API returns valid data', async () => {
    const grants = await getGrantsForUser({
      token: validToken,
      subDomain,
      userId,
    });

    expect(grants).toStrictEqual(validGrants);
  });

  test('should return empty array when user has no grants (404)', async () => {
    server.use(
      http.get(`https://${subDomain}.okta.com/api/v1/users/${userId}/grants`, () => {
        return new Response(undefined, { status: 404 });
      })
    );

    const grants = await getGrantsForUser({
      token: validToken,
      subDomain,
      userId,
    });

    expect(grants).toStrictEqual([]);
  });

  test('should filter out revoked grants', async () => {
    const mixedGrants = [
      ...validGrants,
      {
        ...validGrants[0],
        id: 'grant-revoked',
        status: 'REVOKED',
      },
    ];

    server.use(
      http.get(`https://${subDomain}.okta.com/api/v1/users/${userId}/grants`, () => {
        return Response.json(mixedGrants);
      })
    );

    const grants = await getGrantsForUser({
      token: validToken,
      subDomain,
      userId,
    });

    expect(grants).toHaveLength(1);
    expect(grants[0]?.status).toBe('ACTIVE');
  });

  test('should throw when API returns error', async () => {
    server.use(
      http.get(`https://${subDomain}.okta.com/api/v1/users/${userId}/grants`, () => {
        return new Response(undefined, { status: 500 });
      })
    );

    await expect(
      getGrantsForUser({
        token: validToken,
        subDomain,
        userId,
      })
    ).rejects.toThrow(OktaError);
  });
});

describe('getApplication', () => {
  beforeEach(() => {
    server.use(
      http.get(`https://${subDomain}.okta.com/api/v1/apps/${appId}`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return Response.json(validApplication);
      })
    );
  });

  test('should return application when API returns valid data', async () => {
    const app = await getApplication({
      token: validToken,
      subDomain,
      appId,
    });

    expect(app).toStrictEqual(validApplication);
  });

  test('should throw when API returns error', async () => {
    server.use(
      http.get(`https://${subDomain}.okta.com/api/v1/apps/${appId}`, () => {
        return new Response(undefined, { status: 404 });
      })
    );

    await expect(
      getApplication({
        token: validToken,
        subDomain,
        appId,
      })
    ).rejects.toThrow(OktaError);
  });
});

describe('revokeGrant', () => {
  beforeEach(() => {
    server.use(
      http.delete(
        `https://${subDomain}.okta.com/api/v1/users/${userId}/grants/${grantId}`,
        ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(undefined, { status: 204 });
        }
      )
    );
  });

  test('should successfully revoke grant', async () => {
    await expect(
      revokeGrant({
        token: validToken,
        subDomain,
        userId,
        grantId,
      })
    ).resolves.not.toThrow();
  });

  test('should not throw when grant is already revoked (404)', async () => {
    server.use(
      http.delete(`https://${subDomain}.okta.com/api/v1/users/${userId}/grants/${grantId}`, () => {
        return new Response(undefined, { status: 404 });
      })
    );

    await expect(
      revokeGrant({
        token: validToken,
        subDomain,
        userId,
        grantId,
      })
    ).resolves.not.toThrow();
  });

  test('should throw when API returns error', async () => {
    server.use(
      http.delete(`https://${subDomain}.okta.com/api/v1/users/${userId}/grants/${grantId}`, () => {
        return new Response(undefined, { status: 500 });
      })
    );

    await expect(
      revokeGrant({
        token: validToken,
        subDomain,
        userId,
        grantId,
      })
    ).rejects.toThrow(OktaError);
  });
});

describe('getGrantsForUsers', () => {
  const users = [
    { id: 'user-1', profile: { firstName: 'A', lastName: 'B', email: 'a@b.com' } },
    { id: 'user-2', profile: { firstName: 'C', lastName: 'D', email: 'c@d.com' } },
  ];

  beforeEach(() => {
    server.use(
      http.get(`https://${subDomain}.okta.com/api/v1/users/:userId/grants`, ({ params }) => {
        const userIdParam = params.userId as string;
        if (userIdParam === 'user-1') {
          return Response.json(validGrants);
        }
        return Response.json([]);
      })
    );
  });

  test('should fetch grants for multiple users', async () => {
    const results = await getGrantsForUsers({
      token: validToken,
      subDomain,
      users,
      concurrency: 2,
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toStrictEqual({ userId: 'user-1', grants: validGrants });
    expect(results[1]).toStrictEqual({ userId: 'user-2', grants: [] });
  });

  test('should handle errors gracefully and return empty grants', async () => {
    server.use(
      http.get(`https://${subDomain}.okta.com/api/v1/users/:userId/grants`, () => {
        return new Response(undefined, { status: 500 });
      })
    );

    const results = await getGrantsForUsers({
      token: validToken,
      subDomain,
      users,
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toStrictEqual({ userId: 'user-1', grants: [] });
    expect(results[1]).toStrictEqual({ userId: 'user-2', grants: [] });
  });
});
