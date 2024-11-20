import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env/server';
import { BoxError } from '../common/error';

type GetTokenResponseData = { access_token: string; refresh_token: string; expires_in: number };
type RefreshTokenResponseData = { access_token: string; refresh_token: string; expires_in: number };

const getAuthUserResponseData = z.object({
  id: z.string(),
});

export const getToken = async (code: string) => {
  const response = await fetch(`${env.BOX_API_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.BOX_CLIENT_ID,
      client_secret: env.BOX_CLIENT_SECRET,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new BoxError('Could not retrieve token', { response });
  }

  const data = (await response.json()) as GetTokenResponseData;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};

export const getRefreshToken = async (refreshTokenInfo: string) => {
  const response = await fetch(`${env.BOX_API_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.BOX_CLIENT_ID,
      client_secret: env.BOX_CLIENT_SECRET,
      refresh_token: refreshTokenInfo,
    }).toString(),
  });

  if (!response.ok) {
    throw new BoxError('Could not refresh token', { response });
  }

  const data = (await response.json()) as RefreshTokenResponseData;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};

export const getAuthUser = async (accessToken: string) => {
  const url = new URL(`${env.BOX_API_BASE_URL}/2.0/users/me`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new BoxError('Could not retrieve auth-user id', { response });
  }

  const resData: unknown = await response.json();

  const result = getAuthUserResponseData.safeParse(resData);
  if (!result.success) {
    logger.error('Invalid Box auth-user id response', { resData });
    throw new BoxError('Invalid Box auth-user id response');
  }

  return {
    authUserId: String(result.data.id),
  };
};
