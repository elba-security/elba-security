import { ConfluenceError } from './common/error';
import type { ConfluencePaginatedResponseDataV1 } from './common/pagination';
import { getNextPaginationCursorV1 } from './common/pagination';

type GetGroupIdsParams = {
  accessToken: string;
  instanceId: string;
  cursor: number | null;
  limit: number;
};

/**
 * scopes:
 *   - read:group:confluence
 */
export const getGroupIds = async ({
  accessToken,
  instanceId,
  cursor,
  limit,
}: GetGroupIdsParams) => {
  const url = new URL(`https://api.atlassian.com/ex/confluence/${instanceId}/wiki/rest/api/group`);
  url.searchParams.append('limit', String(limit));
  if (cursor) {
    url.searchParams.append('start', String(cursor));
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ConfluenceError('Could not retrieve groups', { response });
  }

  const data = (await response.json()) as ConfluencePaginatedResponseDataV1<{ id: string }>;

  return {
    cursor: getNextPaginationCursorV1(data),
    groupIds: data.results.map(({ id }) => id),
  };
};

type GetGroupMemberParams = {
  accessToken: string;
  instanceId: string;
  groupId: string;
  cursor: number | null;
};

export type ConfluenceGroupMember = {
  accountId: string;
  accountType: 'atlassian' | 'app';
  email: string | null;
  publicName: string;
  displayName: string | null;
};

/**
 * scopes:
 *   - read:group:confluence
 *   - read:user:confluence
 */
export const getGroupMembers = async ({
  instanceId,
  accessToken,
  groupId,
  cursor,
}: GetGroupMemberParams) => {
  const url = new URL(
    `https://api.atlassian.com/ex/confluence/${instanceId}/wiki/rest/api/group/${groupId}/membersByGroupId`
  );

  if (cursor) {
    url.searchParams.append('start', String(cursor));
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ConfluenceError('Could not retrieve group members', { response });
  }

  const data = (await response.json()) as ConfluencePaginatedResponseDataV1<ConfluenceGroupMember>;

  return {
    cursor: getNextPaginationCursorV1(data),
    members: data.results,
  };
};
