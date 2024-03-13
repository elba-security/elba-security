/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation.
 * When requesting against API endpoint we might prefer to valid the response
 * data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { env } from '@/env';
import { PipedriveError } from './commons/error';

type GetTokenResponseData = {
  access_token: string;
  refresh_token: string;
  api_domain: string;
  expires_in: number;
};

type RefreshTokenResponseData = {
  access_token: string;
  refresh_token: string;
  api_domain: string;
  expires_in: number;
};

export const getToken = async (code: string) => {
  const encodedString = Buffer.from(
    `${env.PIPEDRIVE_CLIENT_ID}:${env.PIPEDRIVE_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${env.PIPEDRIVE_APP_INSTALL_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${encodedString}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      redirect_uri: env.PIPEDRIVE_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new PipedriveError('Could not retrieve token', { response });
  }
  const data = (await response.json()) as GetTokenResponseData;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    apiDomain: data.api_domain,
  };
};

export const getRefreshToken = async (refreshTokenInfo: string) => {
  const encodedString = Buffer.from(
    `${env.PIPEDRIVE_CLIENT_ID}:${env.PIPEDRIVE_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${env.PIPEDRIVE_APP_INSTALL_URL}oauth/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshTokenInfo,
    }).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: encodedString,
    },
  });

  if (!response.ok) {
    throw new PipedriveError('Could not refresh token', { response });
  }

  const data = (await response.json()) as RefreshTokenResponseData;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};
