import { env } from '@/env';
import { JiraError } from './commons/error';

type TokenResponseData = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
};

type AccessibilityResource = { id: string };

export const getAccessToken = async (accessCode: string) => {
  const response = await fetch(env.JIRA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.JIRA_CLIENT_ID,
      client_secret: env.JIRA_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: env.JIRA_CALLBACK_URL,
      code: accessCode,
    }),
  });

  if (!response.ok) {
    throw new JiraError('Could not retrieve token', { response });
  }

  const data = (await response.json()) as TokenResponseData;

  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
};

export const refreshAccessToken = async (refreshToken: string) => {
  const response = await fetch(env.JIRA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.JIRA_CLIENT_ID,
      client_secret: env.JIRA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new JiraError('Could not retrieve token', { response });
  }

  const data = (await response.json()) as TokenResponseData;

  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
};

export async function getCloudId(accessToken: string) {
  try {
    const response = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new JiraError(`Bad response when getting cloud id - ${response.statusText}`);
    }

    const data = (await response.json()) as AccessibilityResource[];

    if (!data.length || !data[0]?.id) {
      throw new JiraError('Could not retrieve cloud id - No accessible resources');
    }

    return { cloudId: data[0].id };
  } catch (error) {
    const message = error?.toString() || 'Unknown error';
    throw new JiraError(`Could not retrieve cloud id - ${message}`);
  }
}
