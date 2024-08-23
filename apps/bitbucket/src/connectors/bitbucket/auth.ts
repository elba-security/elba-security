import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { BitbucketError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

export const getAccessToken = async (code: string) => {
  const response = await fetch(`${env.BITBUCKET_APP_INSTALL_URL}/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.BITBUCKET_CLIENT_ID,
      client_secret: env.BITBUCKET_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: env.BITBUCKET_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new BitbucketError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();
  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Linear token response', { data });
    throw new BitbucketError('Invalid Linear token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};

export const getRefreshToken = async (refreshToken: string) => {
  const response = await fetch(`${env.BITBUCKET_APP_INSTALL_URL}/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.BITBUCKET_CLIENT_ID,
      client_secret: env.BITBUCKET_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    throw new BitbucketError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();
  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Linear token response', { data });
    throw new BitbucketError('Invalid Linear token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};
