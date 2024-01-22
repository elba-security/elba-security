import { expect, test, describe, vi, beforeAll, beforeEach } from 'vitest';
import { GET as handler } from './route';
import { NextResponse } from 'next/server';
import { inngest } from '@/common/clients/inngest';
import { mockRequestResponse } from '@/test-utils/mock-app-route';
import { env } from '@/common/env';

const tokenWillExpiresIn = 14400; // seconds
const rootNamespaceId = '356986';
const organisationId = '00000000-0000-0000-0000-000000000001';

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
              team_member_id: 'test-team-member-id',
            },
          };
        }),
      };
    }),
  };
});

describe('Callback dropbox', () => {
  const redirectSpy = vi.spyOn(NextResponse, 'redirect');
  beforeAll(async () => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    redirectSpy.mockClear();
  });

  test('should redirect to the right page when the callback url has error', async () => {
    const response = await mockRequestResponse({
      method: 'GET',
      handler,
      url: `http://localhost:3000/oauth?error=access_denied`,
    });

    expect(response.status).toBe(307);
    expect(redirectSpy).toHaveBeenCalledTimes(1);
    expect(redirectSpy).toHaveBeenCalledWith(
      `http://localhost:3300/dashboard/security/checks/sources/activation/source-id/user-inconsistencies?source_id=${env.ELBA_SOURCE_ID}&error=unauthorized`
    );
  });

  test("should redirect to the right page when the callback url doesn't have state", async () => {
    const response = await mockRequestResponse({
      method: 'GET',
      handler,
      url: `http://localhost:3000/api/oauth/callback?state=`,
      cookies: {
        organisation_id: organisationId,
        region: 'eu',
      },
    });

    expect(response.status).toBe(307);
    expect(redirectSpy).toHaveBeenCalledTimes(1);
    expect(redirectSpy).toHaveBeenCalledWith(
      `http://localhost:3300/dashboard/security/checks/sources/activation/source-id/user-inconsistencies?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`
    );
  });

  test('should generate the token, insert to db and initiate the user sync process', async () => {
    vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const response = await mockRequestResponse({
      method: 'GET',
      handler,
      url: `http://localhost:3000/api/oauth/callback?code=123&state=${organisationId}`,
      cookies: {
        state: organisationId,
        organisation_id: organisationId,
        region: 'eu',
      },
    });

    expect(response.status).toBe(307);
    expect(redirectSpy).toHaveBeenCalledTimes(1);
  });
});
