/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation.
 * When requesting against API endpoint we might prefer to valid the response
 * data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { env } from '@/env';
import { PagerdutyError } from './commons/error';

type GetTokenResponseData = { access_token: string; refresh_token: string; expires_in: number };
type RefreshTokenResponseData = { access_token: string; refresh_token: string; expires_in: number };

export const getToken = async (code: string) => {
  const response = await fetch(`${env.PAGERDUTY_APP_INSTALL_URL}token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.PAGERDUTY_CLIENT_ID,
      client_secret: env.PAGERDUTY_CLIENT_SECRET,
      redirect_uri: env.PAGERDUTY_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new PagerdutyError('Could not retrieve token', { response });
  }

  const data = (await response.json()) as GetTokenResponseData;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};

export const getRefreshToken = async (refreshTokenInfo: string) => {
  const response = await fetch(`${env.PAGERDUTY_APP_INSTALL_URL}token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.PAGERDUTY_CLIENT_ID,
      client_secret: env.PAGERDUTY_CLIENT_SECRET,
      refresh_token: refreshTokenInfo,
    }).toString(),
  });

  if (!response.ok) {
    throw new PagerdutyError('Could not refresh token', { response });
  }

  const data = (await response.json()) as RefreshTokenResponseData;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};
