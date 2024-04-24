/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation.
 * When requesting against API endpoint we might prefer to valid the response
 * data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { env } from '@/env';
import { ZoomError } from './commons/error';

type GetTokenResponseData = { access_token: string; refresh_token: string; expires_in: number };
type RefreshTokenResponseData = { access_token: string; refresh_token: string; expires_in: number };

export const getToken = async (code: string) => {
  const encodedKey = Buffer.from(`${env.ZOOM_CLIENT_ID}:${env.ZOOM_CLIENT_SECRET}`).toString(
    'base64'
  );

  const response = await fetch(`${env.ZOOM_APP_INSTALL_URL}token`, {
    method: 'POST',
    headers: {
      Authorization: ` Basic ${encodedKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.ZOOM_CLIENT_ID,
      client_secret: env.ZOOM_CLIENT_SECRET,
      redirect_uri: env.ZOOM_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new ZoomError('Could not retrieve token', { response });
  }
  const data = (await response.json()) as GetTokenResponseData;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};

export const getRefreshToken = async (refreshTokenInfo: string) => {
  const encodedKey = Buffer.from(`${env.ZOOM_CLIENT_ID}:${env.ZOOM_CLIENT_SECRET}`).toString(
    'base64'
  );

  const response = await fetch(`${env.ZOOM_APP_INSTALL_URL}token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.ZOOM_CLIENT_ID,
      client_secret: env.ZOOM_CLIENT_SECRET,
      refresh_token: refreshTokenInfo,
    }).toString(),
    headers: {
      Authorization: ` Basic ${encodedKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new ZoomError('Could not refresh token', { response });
  }

  const data = (await response.json()) as RefreshTokenResponseData;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};
