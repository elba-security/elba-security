import { env } from '@/env';
import { HerokuError } from './commons/error';

export type GetTokenResponseData = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export const getAccessToken = async (code: string) => {
  const response = await fetch(
    `https://id.heroku.com/oauth/token?grant_type=authorization_code&code=${code}&client_secret=${env.HEROKU_CLIENT_SECRET}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) {
    throw new HerokuError('Failed to fetch', { response });
  }
  const data = (await response.json()) as GetTokenResponseData;
  const tokenResponse = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
  return tokenResponse;
};

export const refreshAccessToken = async (refreshToken: string) => {
  const response = await fetch(
    `https://id.heroku.com/oauth/token?grant_type=refresh_token&refresh_token=${refreshToken}&client_secret=${env.HEROKU_CLIENT_SECRET}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new HerokuError('Failed to refresh token', { response });
  }
  const data = (await response.json()) as GetTokenResponseData;
  const tokenResponse = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
  return tokenResponse;
};
