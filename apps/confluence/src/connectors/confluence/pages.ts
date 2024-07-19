import { ConfluenceError } from './common/error';
import type { ConfluencePaginatedResponseDataV2 } from './common/pagination';
import { getNextPaginationCursorV2 } from './common/pagination';
import type { ConfluencePageRestrictions } from './page-restrictions';
import { getPageRestrictions } from './page-restrictions';

type ConfluencePage = {
  id: string;
  title: string;
  _links: {
    webui: string;
  };
  spaceId: string;
  ownerId: string;
};

type GetPagesParams = {
  accessToken: string;
  instanceId: string;
  cursor: string | null;
  limit?: number;
};

/**
 * scopes:
 *   - read:page:confluence
 */
export const getPages = async ({ instanceId, accessToken, cursor, limit }: GetPagesParams) => {
  const url = new URL(`https://api.atlassian.com/ex/confluence/${instanceId}/wiki/api/v2/pages`);

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

  const data = (await response.json()) as ConfluencePaginatedResponseDataV2<ConfluencePage>;

  return {
    cursor: getNextPaginationCursorV2(data),
    pages: data.results,
  };
};

type GetPageParams = {
  accessToken: string;
  instanceId: string;
  id: string;
};

/**
 * scopes:
 *   - read:page:confluence
 */
export const getPage = async ({ instanceId, accessToken, id }: GetPageParams) => {
  const response = await fetch(
    `https://api.atlassian.com/ex/confluence/${instanceId}/wiki/api/v2/pages/${id}`,
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
    throw new ConfluenceError('Could not retrieve page', { response });
  }

  const data = (await response.json()) as ConfluencePage;
  return data;
};

export type ConfluencePageWithRestrictions = ConfluencePage & {
  restrictions: ConfluencePageRestrictions[];
};

type GetPagesWithRestrictionsParams = {
  accessToken: string;
  instanceId: string;
  cursor: string | null;
  limit: number;
};

export const getPagesWithRestrictions = async ({
  accessToken,
  instanceId,
  cursor,
  limit,
}: GetPagesWithRestrictionsParams) => {
  const { cursor: nextCursor, pages } = await getPages({
    accessToken,
    instanceId,
    cursor,
    limit,
  });
  const pagesWithRestrictions: ConfluencePageWithRestrictions[] = await Promise.all(
    pages.map(async (page) => {
      const restrictions = await getPageRestrictions({ accessToken, instanceId, pageId: page.id });
      return {
        ...page,
        restrictions,
      };
    })
  );

  return {
    pages: pagesWithRestrictions,
    cursor: nextCursor,
  };
};

type GetPageWithRestrictionsParams = {
  accessToken: string;
  instanceId: string;
  id: string;
};

export const getPageWithRestrictions = async ({
  accessToken,
  instanceId,
  id,
}: GetPageWithRestrictionsParams): Promise<ConfluencePageWithRestrictions | null> => {
  const page = await getPage({
    accessToken,
    instanceId,
    id,
  });

  if (!page) {
    return null;
  }

  const restrictions = await getPageRestrictions({
    accessToken,
    instanceId,
    pageId: id,
  });

  return {
    ...page,
    restrictions,
  };
};
