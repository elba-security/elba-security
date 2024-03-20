import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/common/env';
import { server } from '../../../vitest/setup-msw-handlers';
import { getToken, getRefreshToken } from './auth';
import { GitlabError } from './commons/error';

const validCode = '1234';
const validRefreshToken = '1234';
const accessToken = 'access-token-1234';
const refreshToken = 'refresh-token-1234';
const expiresIn = 60;

describe('auth connector', () => {
  describe('getToken', () => {
    beforeEach(() => {
      server.use(
        http.post('https://gitlab.com/oauth/token', async ({ request }) => {
          const body = await request.text();
          const searchParams = new URLSearchParams(body);

          const clientId = searchParams.get('client_id');
          const clientSecret = searchParams.get('client_secret');
          const grantType = searchParams.get('grant_type');
          const redirectURI = searchParams.get('redirect_uri');
          const code = searchParams.get('code');

          if (
            clientId !== env.GITLAB_CLIENT_ID ||
            clientSecret !== env.GITLAB_CLIENT_SECRET ||
            grantType !== 'authorization_code' ||
            redirectURI !== env.GITLAB_REDIRECT_URI ||
            code !== validCode
          ) {
            return new Response(undefined, { status: 401 });
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- convenience
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
      await expect(getToken('wrong-code')).rejects.toBeInstanceOf(GitlabError);
    });
  });

  describe('getRefreshToken', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post('https://gitlab.com/oauth/token', async ({ request }) => {
          // briefly implement API endpoint behaviour
          const body = await request.text();
          const searchParams = new URLSearchParams(body);

          const clientId = searchParams.get('client_id');
          const clientSecret = searchParams.get('client_secret');
          const refreshTokenInfo = searchParams.get('refresh_token');
          const grantType = searchParams.get('grant_type');

          if (
            clientId !== env.GITLAB_CLIENT_ID ||
            clientSecret !== env.GITLAB_CLIENT_SECRET ||
            grantType !== 'refresh_token' ||
            refreshTokenInfo !== validRefreshToken
          ) {
            return new Response(undefined, { status: 401 });
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- convenience
          return Response.json({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: expiresIn,
          });
        })
      );
    });

    test.only('should return the accessToken when the code is valid', async () => {
      await expect(getRefreshToken(validRefreshToken)).resolves.toStrictEqual({
        accessToken,
        refreshToken,
        expiresIn,
      });
    });

    test('should throw when the code is invalid', async () => {
      await expect(getRefreshToken('wrong-refreshToken')).rejects.toBeInstanceOf(GitlabError);
    });
  });
});
