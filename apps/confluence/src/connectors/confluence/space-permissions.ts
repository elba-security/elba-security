import { ConfluenceError } from './common/error';
import type { ConfluencePaginatedResponseDataV2 } from './common/pagination';
import { getNextPaginationCursorV2 } from './common/pagination';

export type ConfluenceSpacePermission = {
  id: string;
  principal: {
    type: 'user' | 'group' | 'role';
    id: string; // can be 'ANONYMOUS'
  };
};

type GetSpacePermissionsParams = {
  accessToken: string;
  instanceId: string;
  cursor?: string | null;
  spaceId: string;
};

/**
 * scopes:
 *   - read:permission:confluence
 */
export const getSpacePermissions = async ({
  instanceId,
  accessToken,
  cursor,
  spaceId,
}: GetSpacePermissionsParams) => {
  const url = new URL(
    `https://api.atlassian.com/ex/confluence/${instanceId}/wiki/api/v2/spaces/${spaceId}/permissions`
  );

  // 250 is the max allowed value but not the default one
  url.searchParams.append('limit', String(250));
  if (cursor) {
    url.searchParams.append('cursor', cursor);
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ConfluenceError('Could not retrieve pages', { response });
  }

  const data =
    (await response.json()) as ConfluencePaginatedResponseDataV2<ConfluenceSpacePermission>;

  return {
    permissions: data.results,
    cursor: getNextPaginationCursorV2(data),
  };
};

type DeleteSpacePermissionParams = {
  accessToken: string;
  instanceId: string;
  spaceKey: string;
  id: string;
};

/**
 * scopes:
 *   - write:space.permission:confluence
 */
export const deleteSpacePermission = async ({
  accessToken,
  instanceId,
  spaceKey,
  id,
}: DeleteSpacePermissionParams) => {
  const response = await fetch(
    `https://api.atlassian.com/ex/confluence/${instanceId}/wiki/rest/api/space/${spaceKey}/permission/${id}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new ConfluenceError('Could not delete space permission', { response });
  }
};

type GetAllSpacePermissionsParams = {
  accessToken: string;
  instanceId: string;
  spaceId: string;
  maxPage: number;
};

export const getAllSpacePermissions = async (params: GetAllSpacePermissionsParams) => {
  const permissions: ConfluenceSpacePermission[] = [];
  let cursor: string | null = null;
  let i = 0;
  do {
    const result: Awaited<ReturnType<typeof getSpacePermissions>> = await getSpacePermissions({
      ...params,
      cursor,
    });

    permissions.push(...result.permissions);
    cursor = result.cursor;
    i++;
  } while (cursor && i < params.maxPage);

  return permissions;
};
