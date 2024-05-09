import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { JiraError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

const cloudIdResponseSchema = z.array(
  z.object({
    id: z.string(),
  })
);

export const getToken = async (code: string) => {
  const response = await fetch(`${env.JIRA_APP_INSTALL_URL}oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.JIRA_CLIENT_ID,
      client_secret: env.JIRA_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: env.JIRA_REDIRECT_URI,
      code,
    }),
  });

  if (!response.ok) {
    throw new JiraError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Jira token response', { data });
    throw new JiraError('Invalid Jira token response');
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};

export const getRefreshToken = async (refreshTokenInfo: string) => {
  const response = await fetch(`${env.JIRA_APP_INSTALL_URL}oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.JIRA_CLIENT_ID,
      client_secret: env.JIRA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshTokenInfo,
    }),
  });

  if (!response.ok) {
    throw new JiraError('Could not retrieve token', { response });
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

export async function getCloudId(accessToken: string) {
  const response = await fetch(`${env.JIRA_API_BASE_URL}oauth/token/accessible-resources`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new JiraError(`Bad response when getting cloud id - ${response.statusText}`);
  }

  const data: unknown = await response.json();
  const result = cloudIdResponseSchema.safeParse(data);

  if (!result.success || result.data[0] === undefined) {
    logger.error('Invalid Jira cloudId response', { data });
    throw new JiraError('Invalid Jira cloudId response');
  }

  return { cloudId: result.data[0].id };
}
