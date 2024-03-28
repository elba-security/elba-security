import { env } from '@/env';
import { type GetTokenResponseData } from './types';
import { HarvestError } from './commons/error';

export const getAccessToken = async (code: string) => {
  const response = await fetch(
    `https://id.getharvest.com/api/v2/oauth2/token?grant_type=authorization_code&client_id=${env.HARVEST_CLIENT_ID}&client_secret=${env.HARVEST_CLIENT_SECRET}&code=${code}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) {
    throw new HarvestError('Failed to fetch', { response });
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
    `https://id.getharvest.com/api/v2/oauth2/token?grant_type=refresh_token&client_id=${env.HARVEST_CLIENT_ID}&client_secret=${env.HARVEST_CLIENT_SECRET}&refresh_token=${refreshToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new HarvestError('Failed to refresh token', { response });
  }
  const data = (await response.json()) as GetTokenResponseData;
  const tokenResponse = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
  return tokenResponse;
};
