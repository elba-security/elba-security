import { ConfluenceError } from '../common/error';

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

  const instance = data.at(0);
  if (!instance) {
    throw new ConfluenceError('Could not retrieve a connected instance');
  }

  return instance;
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
