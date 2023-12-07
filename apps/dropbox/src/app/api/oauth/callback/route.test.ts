import { expect, test, describe, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { GET as handler } from './route';
import { tokens, db } from '@/database';
import { RequestMethod, createMocks } from 'node-mocks-http';
import { addSeconds } from 'date-fns';
import timekeeper from 'timekeeper';
import { NextRequest, NextResponse } from 'next/server';

const TOKEN_GENERATED_AT = '2023-03-13T16:19:20.818Z';
const TOKEN_WILL_EXPIRE_IN = 14400; // seconds
const ROOT_NAMESPACE_ID = '356986';
const ORGANISATION_ID = '65a9f078-5ab6-4f87-a9e9-cbe91d797562';

// Mock Dropbox sdk
vi.mock('dropbox', () => {
  const actual = vi.importActual('dropbox');
  return {
    ...actual,
    DropboxAuth: vi.fn(() => {
      return {
        getAuthenticationUrl: vi.fn(() => {
          return 'dropbox-auth-url';
        }),
        getAccessTokenFromCode: vi.fn(() => {
          return {
            status: 200,
            result: {
              access_token: 'test-access-token',
              refresh_token: 'test-refresh-token',
              expires_in: TOKEN_WILL_EXPIRE_IN,
            },
          };
        }),
      };
    }),
    Dropbox: vi.fn(() => {
      return {
        setHeaders: vi.fn(() => {}),
        teamTokenGetAuthenticatedAdmin: vi.fn(() => {
          return {
            status: 200,
            result: {
              admin_profile: {
                status: {
                  '.tag': 'active',
                },
                team_member_id: 'test-team-member-id',
                membership_type: {
                  '.tag': 'full',
                },
              },
            },
          };
        }),
        usersGetCurrentAccount: vi.fn(() => {
          return {
            status: 200,
            result: {
              name: {
                display_name: '123',
              },
              account_type: {
                '.tag': 'business',
              },
              root_info: {
                '.tag': 'team',
                root_namespace_id: ROOT_NAMESPACE_ID,
              },
              team: {
                name: 'test-team-name',
              },
            },
          };
        }),
      };
    }),
  };
});

const mockRequestResponse = (method: RequestMethod = 'GET') => {
  const { req, res } = createMocks({
    method,
  });

  req.cookies = {
    get: vi.fn(() => {
      return {
        value: ORGANISATION_ID,
      };
    }),
  };
  return { req, res };
};

describe('Callback dropbox', () => {
  const redirectSpy = vi.spyOn(NextResponse, 'redirect');
  beforeAll(async () => {
    vi.clearAllMocks();
    timekeeper.freeze(TOKEN_GENERATED_AT);
  });

  afterAll(() => {
    timekeeper.reset();
  });

  beforeEach(() => {
    redirectSpy.mockClear();
  });

  test('should redirect to the right page when the callback url has error', async () => {
    const { req } = mockRequestResponse();
    req.url = `http://localhost:3000/api/oauth/callback?access_denied=true`;
    const response = await handler(req);

    // Assert that the response status is 401
    expect(response.status).toBe(307);
    expect(redirectSpy).toHaveBeenCalledTimes(1);
    expect(redirectSpy).toHaveBeenCalledWith('https://admin.elba.ninja');
  });

  test("should redirect to the right page when the callback url doesn't have state", async () => {
    const { req } = mockRequestResponse();
    req.url = `http://localhost:3000/api/oauth/callback?state=`;
    const response = await handler(req);

    // Assert that the response status is 401
    expect(response.status).toBe(307);
    expect(redirectSpy).toHaveBeenCalledTimes(1);
    expect(redirectSpy).toHaveBeenCalledWith('https://admin.elba.ninja');
  });

  test('should return the expected response', async () => {
    // Make a fetch request to the mock server

    const { req } = mockRequestResponse();
    req.url = `http://localhost:3000/api/oauth/callback?code=123&state=${ORGANISATION_ID}`;
    const response = await handler(req);

    const tokenValues = {
      organisationId: ORGANISATION_ID,
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      teamName: 'test-team-name',
      adminTeamMemberId: 'test-team-member-id',
      rootNamespaceId: ROOT_NAMESPACE_ID,
      expiresAt: addSeconds(new Date(TOKEN_GENERATED_AT), TOKEN_WILL_EXPIRE_IN),
    };

    await db.delete(tokens);
    await db.insert(tokens).values(tokenValues);
    // Assert that the response status is 200
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
  });
});
