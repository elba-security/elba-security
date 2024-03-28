import { ConfluenceError } from './common/error';
import type { ConfluencePaginatedResponseDataV2 } from './common/pagination';
import { getNextPaginationCursorV2 } from './common/pagination';
import type { ConfluenceSpacePermission } from './space-permissions';
import { getAllSpacePermissions } from './space-permissions';

export type ConfluenceSpace = {
  id: string;
  key: string;
  name: string;
  authorId: string;
  type: 'global' | 'personal';
  _links: {
    webui: string;
  };
};

type GetSpacesParams = {
  accessToken: string;
  instanceId: string;
  cursor: string | null;
  type: 'global' | 'personal';
  limit?: number;
};

/**
 * scopes:
 *   - read:space:confluence
 */
export const getSpaces = async ({
  instanceId,
  accessToken,
  cursor,
  limit,
  type,
}: GetSpacesParams) => {
  const url = new URL(`https://api.atlassian.com/ex/confluence/${instanceId}/wiki/api/v2/spaces`);
  url.searchParams.append('type', type);
  if (limit) {
    url.searchParams.append('limit', String(limit));
  }
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

  const data = (await response.json()) as ConfluencePaginatedResponseDataV2<ConfluenceSpace>;

  return {
    cursor: getNextPaginationCursorV2(data),
    spaces: data.results,
  };
};

type GetSpaceParams = {
  accessToken: string;
  instanceId: string;
  id: string;
};

/**
 * scopes:
 *   - read:space:confluence
 */
export const getSpace = async ({ instanceId, accessToken, id }: GetSpaceParams) => {
  const response = await fetch(
    `https://api.atlassian.com/ex/confluence/${instanceId}/wiki/api/v2/spaces/${id}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new ConfluenceError('Could not retrieve space', { response });
  }

  const data = (await response.json()) as ConfluenceSpace;

  return data;
};

export type ConfluenceSpaceWithPermissions = ConfluenceSpace & {
  permissions: ConfluenceSpacePermission[];
};

type GetSpacesWithPermissionsParams = {
  accessToken: string;
  instanceId: string;
  cursor: string | null;
  type: 'global' | 'personal';
  permissionsMaxPage: number;
  limit?: number;
};

export const getSpacesWithPermissions = async (params: GetSpacesWithPermissionsParams) => {
  const { spaces, cursor } = await getSpaces({
    accessToken: params.accessToken,
    instanceId: params.instanceId,
    cursor: params.cursor,
    type: params.type,
    limit: params.limit,
  });

  const spacesWithPermissions = await Promise.all(
    spaces.map<Promise<ConfluenceSpaceWithPermissions>>(async (space) => ({
      ...space,
      permissions: await getAllSpacePermissions({
        instanceId: params.instanceId,
        accessToken: params.accessToken,
        spaceId: space.id,
        maxPage: params.permissionsMaxPage,
      }),
    }))
  );

  return {
    spaces: spacesWithPermissions,
    cursor,
  };
};

type GetSpaceWithPermissionsParams = {
  accessToken: string;
  instanceId: string;
  id: string;
  permissionsMaxPage: number;
};

export const getSpaceWithPermissions = async ({
  instanceId,
  accessToken,
  id,
  permissionsMaxPage,
}: GetSpaceWithPermissionsParams): Promise<ConfluenceSpaceWithPermissions | null> => {
  const space = await getSpace({ instanceId, accessToken, id });

  if (!space) {
    return null;
  }

  const permissions = await getAllSpacePermissions({
    instanceId,
    accessToken,
    spaceId: id,
    maxPage: permissionsMaxPage,
  });

  return {
    ...space,
    permissions,
  };
};
