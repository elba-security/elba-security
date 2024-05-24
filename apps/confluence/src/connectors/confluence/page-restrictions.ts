import { ConfluenceError } from './common/error';
import type { ConfluencePaginatedResponseDataV1 } from './common/pagination';

export type ConfluenceOperationRestrictionUser = {
  accountId: string;
  accountType: 'atlassian' | 'app';
  publicName: string;
  displayName: string | null;
};

export type ConfluenceOperationRestriction = {
  user: {
    results: ConfluenceOperationRestrictionUser[];
  };
};

export type ConfluencePageRestrictions =
  | {
      operation: 'read';
      restrictions: ConfluenceOperationRestriction;
    }
  | {
      operation: 'write';
      restrictions: ConfluenceOperationRestriction;
    };

export type GetPageRestrictionsParams = {
  accessToken: string;
  instanceId: string;
  pageId: string;
};

/**
 * scopes:
 *   - read:content-details:confluence
 */
export const getPageRestrictions = async ({
  instanceId,
  accessToken,
  pageId,
}: GetPageRestrictionsParams) => {
  const response = await fetch(
    `https://api.atlassian.com/ex/confluence/${instanceId}/wiki/rest/api/content/${pageId}/restriction`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new ConfluenceError('Could not retrieve pages', { response });
  }

  const data =
    (await response.json()) as ConfluencePaginatedResponseDataV1<ConfluencePageRestrictions>;

  return data.results;
};

type DeletePageUserOperationRestrictionParams = {
  accessToken: string;
  instanceId: string;
  pageId: string;
  userId: string;
  operationKey: 'read' | 'update';
};

/**
 * scopes:
 *   - write:content.restriction:confluence
 */
export const deletePageUserOperationRestriction = async ({
  instanceId,
  accessToken,
  pageId,
  operationKey,
  userId,
}: DeletePageUserOperationRestrictionParams) => {
  const response = await fetch(
    `https://api.atlassian.com/ex/confluence/${instanceId}/wiki/rest/api/content/${pageId}/restriction/byOperation/${operationKey}/user?accountId=${userId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new ConfluenceError('Could not delete user restrictions', { response });
  }
};

export const deletePageUserRestrictions = async (
  params: Omit<DeletePageUserOperationRestrictionParams, 'operationKey'>
) => {
  await Promise.all([
    deletePageUserOperationRestriction({ ...params, operationKey: 'read' }),
    deletePageUserOperationRestriction({ ...params, operationKey: 'update' }),
  ]);
};
