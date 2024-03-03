import { env } from '@/env';
import { type GetTokenResponseData } from './types';

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
    throw new Error('Could not refresh Calendly access token.');
  }
  const data = (await response.json()) as GetTokenResponseData;
  const tokenData = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
  return tokenData;
};
