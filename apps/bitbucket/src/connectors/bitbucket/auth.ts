import { env } from '@/env';
import { BitbucketError } from '../commons/error';

type TokenResponseData = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
};

export const getAccessToken = async (accessCode: string) => {
  const response = await fetch(env.BB_ACCESS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.BB_CLIENT_ID,
      client_secret: env.BB_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: accessCode,
      redirect_uri: env.BB_CALLBACK_URL,
    }),
  });

  if (!response.ok) {
    throw new BitbucketError('Could not retrieve token', { response });
  }

  const data = (await response.json()) as TokenResponseData;

  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
};

export const refreshAccessToken = async (refreshToken: string) => {
  const response = await fetch(env.BB_ACCESS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.BB_CLIENT_ID,
      client_secret: env.BB_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new BitbucketError('Could not refresh token', { response });
  }

  const data = (await response.json()) as TokenResponseData;

  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
};
