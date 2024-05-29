import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { AsanaError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

const workspaceResponseSchema = z.object({
  data: z.array(
    z.object({
      gid: z.string(),
    })
  ),
});

export const getToken = async (code: string) => {
  const response = await fetch(`${env.ASANA_APP_INSTALL_URL}oauth_token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.ASANA_CLIENT_ID,
      client_secret: env.ASANA_CLIENT_SECRET,
      redirect_uri: env.ASANA_REDIRECT_URI,
      code,
    }).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
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
  };
};

export const getRefreshToken = async (refreshTokenInfo: string) => {
  const response = await fetch(`${env.ASANA_APP_INSTALL_URL}oauth_token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.ASANA_CLIENT_ID,
      client_secret: env.ASANA_CLIENT_SECRET,
      refresh_token: refreshTokenInfo,
    }).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new AsanaError('Could not retrieve token', { response });
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

export const getWorkspaceIds = async (accessToken: string) => {
  const response = await fetch(`${env.ASANA_API_BASE_URL}/workspaces`, {
    method: 'get',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new AsanaError('Could not retrieve workspace');
  }

  const resData: unknown = await response.json();

  const result = workspaceResponseSchema.safeParse(resData);

  if (!result.success) {
    throw new AsanaError('Could not parse workspace response');
  }

  if (result.data.data.length === 0) {
    throw new AsanaError('No workspace found');
  }

  const workspaceIds = result.data.data.map((board) => board.gid);

  if (!workspaceIds.length) {
    throw new AsanaError('No Main workspace found');
  }

  return workspaceIds;
};
