import { expect, test, describe, vi, beforeAll, beforeEach } from 'vitest';
import { GET as handler } from './route';
import { NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';
import { mockNextRequest } from '@/test-utils/mock-app-route';
import { env } from '@/env';
import * as crypto from '@/common/crypto';
import { addSeconds, subMinutes } from 'date-fns';

const tokenWillExpiresIn = 14400; // seconds
const rootNamespaceId = '356986';
const organisationId = '00000000-0000-0000-0000-000000000001';
const SYNC_STARTED_AT = 1674496756;
const TOKEN_WILL_EXPIRE_IN = 14400;
const TOKEN_EXPIRES_AT = addSeconds(new Date(SYNC_STARTED_AT), TOKEN_WILL_EXPIRE_IN);

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
    vi.setSystemTime(new Date(SYNC_STARTED_AT));
    vi.clearAllMocks();
  });

  beforeEach(() => {
    redirectSpy.mockClear();
  });

  test('should redirect to the right page when the callback url has error', async () => {
    vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const response = await mockNextRequest({
      method: 'GET',
      handler,
      url: `http://localhost:3000/oauth?error=access_denied`,
    });

    expect(response.status).toBe(307);
    expect(redirectSpy).toBeCalledTimes(1);
    expect(redirectSpy).toHaveBeenCalledWith(
      `https://api.elba.io/dashboard/security/checks/sources/activation/source-id/user-inconsistencies?source_id=${env.ELBA_SOURCE_ID}&error=unauthorized`
    );
    expect(inngest.send).toBeCalledTimes(0);
  });

  test("should redirect to the right page when the callback url doesn't have state", async () => {
    const response = await mockNextRequest({
      method: 'GET',
      handler,
      url: `http://localhost:3000/oauth?state=`,
      cookies: {
        organisation_id: organisationId,
        region: 'eu',
      },
    });

    expect(response.status).toBe(307);
    expect(redirectSpy).toBeCalledTimes(1);
    expect(redirectSpy).toHaveBeenCalledWith(
      `https://api.elba.io/dashboard/security/checks/sources/activation/source-id/user-inconsistencies?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`
    );
  });

  test('should generate the token, insert to db and initiate the user sync process', async () => {
    vi.spyOn(crypto, 'encrypt').mockResolvedValue('encrypted-token');
    vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const response = await mockNextRequest({
      method: 'GET',
      handler,
      url: `http://localhost:3000/oauth?code=123&state=${organisationId}`,
      cookies: {
        state: organisationId,
        organisation_id: organisationId,
        region: 'eu',
      },
    });

    expect(response.status).toBe(307);

    expect(crypto.encrypt).toBeCalledTimes(1);
    expect(crypto.encrypt).toHaveBeenCalledWith('test-access-token');
    expect(redirectSpy).toBeCalledTimes(1);
    expect(inngest.send).toBeCalledTimes(1);
    expect(inngest.send).toHaveBeenCalledWith([
      {
        data: {
          organisationId: '00000000-0000-0000-0000-000000000001',
        },
        name: 'dropbox/token.refresh.triggered',
        ts: subMinutes(new Date(TOKEN_EXPIRES_AT), 30).getTime(),
      },
      {
        data: {
          organisationId: '00000000-0000-0000-0000-000000000001',
        },
        name: 'dropbox/token.refresh.canceled',
      },
      {
        data: {
          isFirstSync: true,
          organisationId: '00000000-0000-0000-0000-000000000001',
          syncStartedAt: SYNC_STARTED_AT,
        },
        name: 'dropbox/users.sync_page.triggered',
      },
    ]);
  });
});
