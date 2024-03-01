import { expect, test, describe, vi, beforeAll, beforeEach } from 'vitest';
import { GET as handler } from './route';
import { NextResponse } from 'next/server';
import * as utils from '@/common/utils';
import { inngest } from '@/inngest/client';
import { mockNextRequest } from '@/test-utils/mock-app-route';
import * as crypto from '@/common/crypto';

const tokenWillExpiresIn = 14400; // seconds
const rootNamespaceId = '356986';
const organisationId = '00000000-0000-0000-0000-000000000001';
const SYNC_STARTED_AT = 1674496756;

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
  const errorRedirectResponse = new NextResponse('error');
  const successRedirectResponse = new NextResponse('success');

  beforeEach(() => {
    vi.spyOn(utils, 'redirectOnError').mockReturnValueOnce(errorRedirectResponse);
    vi.spyOn(utils, 'redirectOnSuccess').mockReturnValueOnce(successRedirectResponse);
  });

  beforeAll(async () => {
    vi.setSystemTime(new Date(SYNC_STARTED_AT));
    vi.clearAllMocks();
  });

  test('should redirect to the right page when the callback url has error', async () => {
    vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const response = await mockNextRequest({
      method: 'GET',
      handler,
      url: `http://localhost:3000/oauth?error=access_denied`,
      cookies: {
        organisationId,
        region: 'eu',
      },
    });

    expect(response).toBe(errorRedirectResponse);
    expect(utils.redirectOnError).toBeCalledTimes(1);
    expect(utils.redirectOnError).toBeCalledWith('eu', 'unauthorized');
    expect(utils.redirectOnSuccess).toBeCalledTimes(0);
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

    expect(response).toBe(errorRedirectResponse);
    expect(utils.redirectOnError).toBeCalledTimes(1);
    expect(utils.redirectOnError).toBeCalledWith('eu', 'internal_error');
    expect(utils.redirectOnSuccess).toBeCalledTimes(0);
    expect(inngest.send).toBeCalledTimes(0);
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

    expect(response).toBe(successRedirectResponse);
    expect(utils.redirectOnError).toBeCalledTimes(0);
    expect(utils.redirectOnSuccess).toBeCalledTimes(1);
    expect(utils.redirectOnSuccess).toBeCalledWith('eu');
    expect(inngest.send).toBeCalledTimes(1);
    expect(inngest.send).toHaveBeenCalledWith(
      expect.arrayContaining([
        {
          data: {
            organisationId: '00000000-0000-0000-0000-000000000001',
            expiresAt: 1688896756,
          },
          name: 'dropbox/token.refresh.requested',
        },
        {
          data: {
            organisationId: '00000000-0000-0000-0000-000000000001',
          },
          name: 'dropbox/app.install.requested',
        },
        {
          data: {
            isFirstSync: true,
            organisationId: '00000000-0000-0000-0000-000000000001',
            syncStartedAt: SYNC_STARTED_AT,
          },
          name: 'dropbox/users.sync_page.requested',
        },
      ])
    );
  });
});
