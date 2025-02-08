import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { AsanaError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  data: z.object({
    id: z.number(),
  }),
});

export const getToken = async (code: string) => {
  const response = await fetch(`${env.ASANA_APP_INSTALL_URL}/oauth_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.ASANA_CLIENT_ID,
      client_secret: env.ASANA_CLIENT_SECRET,
      redirect_uri: env.ASANA_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new AsanaError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Asana token response', { data });
    throw new AsanaError('Invalid Asana token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
    authUserId: String(result.data.data.id),
  };
};

export const getRefreshToken = async (refreshToken: string) => {
  const response = await fetch(`${env.ASANA_APP_INSTALL_URL}/oauth_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.ASANA_CLIENT_ID,
      client_secret: env.ASANA_CLIENT_SECRET,
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    throw new AsanaError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  logger.info('Refresh token response', { data });

  // Asana refresh token is long-lived and does not return a refresh token
  const result = tokenResponseSchema.omit({ refresh_token: true }).safeParse(data);

  if (!result.success) {
    logger.error('Invalid Jira refresh token response', {
      data,
      result: JSON.stringify(result, null, 2),
    });
    throw new Error('Invalid Asana token response');
  }

  return {
    accessToken: result.data.access_token,
    expiresIn: result.data.expires_in,
  };
};
