import { env } from '@/env';
import { type GetTokenResponseData } from './types';
import { CalendlyError } from './commons/error';

export const getAccessToken = async (code: string) => {
  const credentials = `${env.CALENDLY_CLIENT_ID}:${env.CALENDLY_CLIENT_SECRET}`;
  const encodedCredentials = btoa(credentials);

  const bodyData = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.CALENDLY_REDIRECT_URI,
  };

  const response = await fetch('https://auth.calendly.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${encodedCredentials}`,
    },
    body: JSON.stringify(bodyData),
  });

  if (!response.ok) {
    throw new CalendlyError('Failed to fetch', { response });
  }
  const data = (await response.json()) as GetTokenResponseData;
  const tokenResponse = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    organization: data.organization,
  };
  return tokenResponse;
};

export const refreshAccessToken = async (refreshToken: string) => {
  const credentials = `${env.CALENDLY_CLIENT_ID}:${env.CALENDLY_CLIENT_SECRET}`;
  const encodedCredentials = btoa(credentials);

  const bodyData = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  };

  const response = await fetch('https://auth.calendly.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${encodedCredentials}`,
    },
    body: JSON.stringify(bodyData),
  });

  if (!response.ok) {
    throw new CalendlyError('Failed to fetch', { response });
  }
  const data = (await response.json()) as GetTokenResponseData;
  const tokenResponse = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
  return tokenResponse;
};
