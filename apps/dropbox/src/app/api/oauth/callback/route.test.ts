import { expect, test, describe, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { GET as handler } from './route';
import { tokens, db } from '@/database';
import { RequestMethod, createMocks } from 'node-mocks-http';
import { addSeconds } from 'date-fns';
import timekeeper from 'timekeeper';
import { NextRequest, NextResponse } from 'next/server';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { runUserSyncJobs } from '../../inngest/functions/users/run-user-sync-jobs';
import { inngest } from '@/common/clients/inngest';

const tokenGeneratedAt = '2023-03-13T16:19:20.818Z';
const tokenWillExpiresIn = 14400; // seconds
const rootNamespaceId = '356986';
const organisationId = '00000000-0000-0000-0000-000000000001';
const accessToken = 'access-token-1';

const setup = createInngestFunctionMock(runUserSyncJobs, 'users/run-user-sync-jobs');

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
              expires_in: tokenWillExpiresIn,
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
                root_namespace_id: rootNamespaceId,
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
        value: organisationId,
      };
    }),
  };
  return { req, res };
};

describe('Callback dropbox', () => {
  const redirectSpy = vi.spyOn(NextResponse, 'redirect');
  beforeAll(async () => {
    vi.clearAllMocks();
    timekeeper.freeze(tokenGeneratedAt);
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

  test('should generate the token, insert to db and initiate the user sync process', async () => {
    vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const { req } = mockRequestResponse();
    req.url = `http://localhost:3000/api/oauth/callback?code=123&state=${organisationId}`;
    const response = await handler(req);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
  });
});
