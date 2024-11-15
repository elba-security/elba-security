import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env/server';
import { SalesloftError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

const getAuthUserResponseData = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.object({
    id: z.string(),
  }),
});

export const getToken = async (code: string) => {
  const response = await fetch(`${env.SALESLOFT_APP_INSTALL_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.SALESLOFT_CLIENT_ID,
      client_secret: env.SALESLOFT_CLIENT_SECRET,
      redirect_uri: env.SALESLOFT_REDIRECT_URI,
      code,
    }),
  });

  if (!response.ok) {
    throw new SalesloftError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.parse(data);

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresIn: result.expires_in,
  };
};

export const getRefreshToken = async (refreshToken: string) => {
  const response = await fetch(`${env.SALESLOFT_APP_INSTALL_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: env.SALESLOFT_CLIENT_ID,
      client_secret: env.SALESLOFT_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    throw new SalesloftError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  try {
    const result = tokenResponseSchema.parse(data);
    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresIn: result.expires_in,
    };
  } catch (error) {
    logger.error('Invalid Salesloft refresh token response', { data, error });
    throw error;
  }
};

export const getAuthUser = async (accessToken: string) => {
  const url = new URL(`${env.SALESLOFT_API_BASE_URL}/v2/me`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new SalesloftError('Could not retrieve auth user', { response });
  }

  const resData: unknown = await response.json();

  const result = z
    .object({
      data: getAuthUserResponseData,
    })
    .safeParse(resData);

  if (!result.success) {
    throw new SalesloftError('Could not parse auth user', { response });
  }

  return result.data.data;
};
