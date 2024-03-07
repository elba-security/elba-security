/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation.
 * When requesting against API endpoint we might prefer to valid the response
 * data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { env } from '@/env';
import { SmartSheetError } from './commons/error';

export type GetTokenResponseData = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export type RefreshTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: Date;
};

export const getToken = async (code: string) => {
  const requestBody = new URLSearchParams();
  requestBody.append('grant_type', 'authorization_code');
  requestBody.append('code', code);
  requestBody.append('redirect_uri', env.SMART_SHEET_REDIRECT_URL);
  requestBody.append('client_id', env.SMART_SHEET_CLIENT_KEY);
  requestBody.append('client_secret', env.SMART_SHEET_CLIENT_SECRET);

  const response = await fetch(env.SMART_SHEET_TOKEN_URL, {
    method: 'POST',
    body: requestBody.toString(),
    headers: {
      Authorization: `${env.SMART_SHEET_CLIENT_KEY}:${env.SMART_SHEET_CLIENT_SECRET}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new SmartSheetError('Could not retrieve token', { response });
  }
  const data = (await response.json()) as GetTokenResponseData;
  return data;
};

export const getRefreshedToken = async (refreshToken: string) => {
  const requestBody = new URLSearchParams();
  requestBody.append('grant_type', 'refresh_token');
  requestBody.append('refresh_token', refreshToken);

  const response = await fetch(env.SMART_SHEET_TOKEN_URL, {
    method: 'POST',
    body: requestBody.toString(),
    headers: {
      Authorization: `Basic ${btoa(
        `${env.SMART_SHEET_CLIENT_KEY}:${env.SMART_SHEET_CLIENT_SECRET}`
      )}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new SmartSheetError('Could not retrieve token', { response });
  }

  const data = (await response.json()) as GetTokenResponseData;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};
