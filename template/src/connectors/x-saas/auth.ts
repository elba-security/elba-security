/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation.
 * When requesting against API endpoint we might prefer to valid the response
 * data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { env } from '@/common/env';
import { XSaasError } from './commons/error';

type GetTokenResponseData = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export const getToken = async (code: string) => {
  const response = await fetch('https://mysaas.com/api/v1/token', {
    method: 'POST',
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: env.X_SAAS_CLIENT_ID,
      client_secret: env.X_SAAS_CLIENT_SECRET,
      redirect_uri: env.X_SAAS_REDIRECT_URI,
      code,
    }),
  });

  if (!response.ok) {
    throw new XSaasError('Could not retrieve token', { response });
  }

  const data = (await response.json()) as GetTokenResponseData;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};

type GetRefreshedTokenResponseData = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export const getRefreshedToken = async (refreshToken: string) => {
  const response = await fetch('https://mysaas.com/api/v1/token', {
    method: 'POST',
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: env.X_SAAS_CLIENT_ID,
      client_secret: env.X_SAAS_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new XSaasError('Could not refresh token', { response });
  }

  const data = (await response.json()) as GetRefreshedTokenResponseData;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};
