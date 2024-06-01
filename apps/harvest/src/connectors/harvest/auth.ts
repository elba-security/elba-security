import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { HarvestError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

const accountIdsResponseSchema = z.object({
  accounts: z.array(
    z.object({
      id: z.number(),
    })
  ),
});

type GetAccountIdsParams = {
  accessToken: string;
};

export const getToken = async (code: string) => {
  const response = await fetch(`${env.HARVEST_APP_INSTALL_URL}/api/v2/oauth2/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.HARVEST_CLIENT_ID,
      client_secret: env.HARVEST_CLIENT_SECRET,
      code,
    }).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new HarvestError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Harvest token response', { data });
    throw new HarvestError('Invalid Harvest token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};
export const getRefreshToken = async (refreshTokenInfo: string) => {
  const response = await fetch(`${env.HARVEST_APP_INSTALL_URL}/api/v2/oauth2/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.HARVEST_CLIENT_ID,
      client_secret: env.HARVEST_CLIENT_SECRET,
      refresh_token: refreshTokenInfo,
    }).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new HarvestError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Jira refresh token response', { data });
    throw new Error('Invalid Jira token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};
export const getAccountIds = async ({ accessToken }: GetAccountIdsParams) => {
  const response = await fetch(`${env.HARVEST_APP_INSTALL_URL}/api/v2/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new HarvestError('Failed to fetch', { response });
  }
  const resData: unknown = await response.json();
  const result = accountIdsResponseSchema.safeParse(resData);

  if (!result.success) {
    throw new HarvestError('Could not parse accounts response');
  }

  if (result.data.accounts.length === 0) {
    throw new HarvestError('No account found');
  }
  const accountIds = result.data.accounts.map(({ id }) => String(id));

  return accountIds;
};
