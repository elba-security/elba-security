/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation.
 * When requesting against API endpoint we might prefer to valid the response
 * data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { env } from '@/env';
import { GitlabError } from './commons/error';

type GetTokenResponseData = { access_token: string, refresh_token: string, expires_in: number };
type RefreshTokenResponseData = { access_token: string, refresh_token: string, expires_in: number };

export const getToken = async (code: string) => {
 
  const response = await fetch(`${env.GITLAB_API_BASE_URL}oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.GITLAB_CLIENT_ID,
      client_secret: env.GITLAB_CLIENT_SECRET,
      redirect_uri: env.GITLAB_REDIRECT_URI,
      code_verifier: "ks02i3jdikdo2k0dkfodf3m39rjfjsdk0wk349rj3jrhf",
      code
    }).toString(),
  });

  if (!response.ok) {
    throw new GitlabError('Could not retrieve token', { response });
  }
  const data = (await response.json()) as GetTokenResponseData;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    // TODO: undo /60 when new refresh token flow is implemented 
    expiresIn: data.expires_in/60,
  };
};

export const getRefreshToken = async (refreshTokenInfo: string) => {
  const response = await fetch(`${env.GITLAB_API_BASE_URL}oauth/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.GITLAB_CLIENT_ID,
      client_secret: env.GITLAB_CLIENT_SECRET,
      refresh_token: refreshTokenInfo,
    }).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new GitlabError('Could not retrieve token', { response });
  }

  const data = (await response.json()) as RefreshTokenResponseData;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in/60,
  };
};