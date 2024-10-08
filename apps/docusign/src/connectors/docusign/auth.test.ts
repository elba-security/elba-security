import { http } from 'msw';
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import * as userConnector from '@/connectors/docusign/users';
import { DocusignError } from '../common/error';
import { getAuthUser, getRefreshToken, getToken } from './auth';

const validCode = '1234';
const accessToken = 'access-token-1234';
const refreshToken = 'refresh-token-1234';
const validRefreshToken = 'valid-refresh-token';
const expiresIn = 3600;

describe('auth connector', () => {
  describe('getToken', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.DOCUSIGN_APP_INSTALL_URL}/oauth/token`, async ({ request }) => {
          const body = await request.text();
          const searchParams = new URLSearchParams(body);

          const grantType = searchParams.get('grant_type');
          const code = searchParams.get('code');

          if (grantType !== 'authorization_code' || code !== validCode) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: expiresIn,
          });
        })
      );
    });

    test('should return the accessToken when the code is valid', async () => {
      await expect(getToken(validCode)).resolves.toStrictEqual({
        accessToken,
        refreshToken,
        expiresIn,
      });
    });

    test('should throw when the code is invalid', async () => {
      await expect(getToken('wrong-code')).rejects.toBeInstanceOf(DocusignError);
    });
  });

  describe('getRefreshToken', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.DOCUSIGN_APP_INSTALL_URL}/oauth/token`, async ({ request }) => {
          const body = await request.text();
          const searchParams = new URLSearchParams(body);

          const grantType = searchParams.get('grant_type');
          const token = searchParams.get('refresh_token');

          if (grantType !== 'refresh_token' || token !== validRefreshToken) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: expiresIn,
          });
        })
      );
    });

    test('should return the refreshToken when the refreshToken is valid', async () => {
      await expect(getRefreshToken(validRefreshToken)).resolves.toStrictEqual({
        accessToken,
        refreshToken,
        expiresIn,
      });
    });

    test('should throw when the refreshToken is invalid', async () => {
      await expect(getToken('wrong-refreshtoken')).rejects.toBeInstanceOf(DocusignError);
    });
  });

  describe('getAuthUser', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.DOCUSIGN_APP_INSTALL_URL}/oauth/userinfo`, () => {
          return Response.json({
            sub: '00000000-0000-0000-0000-000000000001',
            accounts: [
              {
                account_id: '00000000-0000-0000-0000-000000000010',
                base_uri: 'https://api.docusign.net',
                is_default: true,
                account_name: 'Account Name',
              },
            ],
          });
        })
      );
    });

    test('should return current authenticated user info', async () => {
      const getUser = vi.spyOn(userConnector, 'getUser').mockResolvedValue({
        isAdmin: 'True',
      });

      await expect(getAuthUser(accessToken)).resolves.toStrictEqual({
        accountId: '00000000-0000-0000-0000-000000000010',
        authUserId: '00000000-0000-0000-0000-000000000001',
        apiBaseUri: 'https://api.docusign.net',
      });

      expect(getUser).toBeCalledTimes(1);
      expect(getUser).toBeCalledWith({
        accessToken,
        accountId: '00000000-0000-0000-0000-000000000010',
        apiBaseUri: 'https://api.docusign.net',
        userId: '00000000-0000-0000-0000-000000000001',
      });
    });
  });
});
