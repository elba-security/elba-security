import { env } from '@/common/env';
import { ConfluenceError } from './common/error';

type GetTokenResponseData = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
};

/**
 * scopes: none
 */
export const getToken = async (code: string) => {
  const response = await fetch('https://api.atlassian.com/oauth/token', {
    method: 'POST',
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: env.CONFLUENCE_CLIENT_ID,
      client_secret: env.CONFLUENCE_CLIENT_SECRET,
      code,
      redirect_uri: env.CONFLUENCE_REDIRECT_URI,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ConfluenceError('Could not retrieve token', { response });
  }

  const data = (await response.json()) as GetTokenResponseData;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};

/**
 * scopes:
 *   - offline_access
 */
export const getRefreshedToken = async (refreshToken: string) => {
  const response = await fetch('https://api.atlassian.com/oauth/token', {
    method: 'POST',
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: env.CONFLUENCE_CLIENT_ID,
      client_secret: env.CONFLUENCE_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ConfluenceError('Could not refresh token', { response });
  }

  const data = (await response.json()) as GetTokenResponseData;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};

type GetInstanceResponseData = {
  id: string;
  url: string;
}[];

/**
 * scopes: none
 */
export const getInstance = async (accessToken: string) => {
  const response = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ConfluenceError('Could not retrieve instance id', { response });
  }

  const data = (await response.json()) as GetInstanceResponseData;

  return data.at(0);
};

type GetCurrentUserResponseData = {
  operations: {
    operation: string;
    targetType: string;
  }[];
};

type CheckAdminParams = {
  instanceId: string;
  accessToken: string;
};

/**
 * scopes:
 *   - read:confluence-user
 */
export const checkAdmin = async ({ instanceId, accessToken }: CheckAdminParams) => {
  const url = new URL(
    `https://api.atlassian.com/ex/confluence/${instanceId}/wiki/rest/api/user/current`
  );
  url.searchParams.append('expand', 'operations');
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ConfluenceError('Could not current user', { response });
  }

  const data = (await response.json()) as GetCurrentUserResponseData;

  return data.operations.some(
    ({ operation, targetType }) => operation === 'administer' && targetType === 'application'
  );
};
