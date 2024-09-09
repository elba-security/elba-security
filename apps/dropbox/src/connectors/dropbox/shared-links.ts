import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { DropboxError } from '../common/error';
import { filterSharedLinks } from '../elba/data-protection/shared-link';

const sharedLinkSchema = z.object({
  '.tag': z.union([z.literal('file'), z.literal('folder')]),
  id: z.string(),
  name: z.string(),
  url: z.string(),
  path_lower: z.string(),
  link_permissions: z.object({
    resolved_visibility: z
      .object({
        '.tag': z.string(),
      })
      .optional(),
    effective_audience: z
      .object({
        '.tag': z.string(),
      })
      .optional(),
    link_access_level: z
      .object({
        '.tag': z.string(),
      })
      .optional(),
  }),
});

export type SharedLink = z.infer<typeof sharedLinkSchema>;

const sharedLinksResponseSchema = z.object({
  links: z.array(z.unknown()),
  has_more: z.boolean(),
  cursor: z.string().optional(),
});

type GetSharedLinks = {
  accessToken: string;
  teamMemberId: string;
  isPersonal: boolean;
  pathRoot: string | null;
  cursor: string | null;
};

export const getSharedLinks = async ({
  accessToken,
  teamMemberId,
  isPersonal,
  pathRoot,
  cursor,
}: GetSharedLinks) => {
  const response = await fetch(`${env.DROPBOX_API_BASE_URL}/2/sharing/list_shared_links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Dropbox-API-Select-User': teamMemberId,
      ...(!isPersonal && {
        'Dropbox-API-Path-Root': `{".tag": "root", "root": "${pathRoot}"}`,
      }),
    },
    body: JSON.stringify(cursor ? { cursor } : {}),
  });

  if (!response.ok) {
    throw await DropboxError.fromResponse('Could not retrieve shared links', { response });
  }

  const data: unknown = await response.json();

  const { has_more: hasMore, cursor: nextCursor, links } = sharedLinksResponseSchema.parse(data);

  const validSharedLinks: SharedLink[] = [];

  for (const link of links) {
    const linkResult = sharedLinkSchema.safeParse(link);

    if (!linkResult.success) {
      logger.warn('Invalid Dropbox shared link received', { link });
      continue;
    }

    validSharedLinks.push(linkResult.data);
  }

  const sharedLinks = filterSharedLinks(validSharedLinks);

  return {
    links: sharedLinks,
    nextCursor: hasMore ? nextCursor : null,
  };
};

export const getSharedLinksByPath = async ({
  accessToken,
  teamMemberId,
  isPersonal,
  pathRoot,
  path,
}: {
  accessToken: string;
  teamMemberId: string;
  isPersonal: boolean;
  pathRoot: string | null;
  path: string;
}) => {
  const validSharedLinks: SharedLink[] = [];
  let hasNextCursor: boolean;
  let nextCursor: string | undefined;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'Dropbox-API-Select-User': teamMemberId,
    ...(!isPersonal && {
      'Dropbox-API-Path-Root': `{".tag": "root", "root": "${pathRoot}"}`,
    }),
  };

  do {
    const response = await fetch(`${env.DROPBOX_API_BASE_URL}/2/sharing/list_shared_links`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        cursor: nextCursor,
        path,
      }),
    });

    if (!response.ok) {
      throw await DropboxError.fromResponse('Could not retrieve shared links', { response });
    }

    const data: unknown = await response.json();

    const { has_more: hasMore, cursor, links } = sharedLinksResponseSchema.parse(data);

    for (const link of links) {
      const linkResult = sharedLinkSchema.safeParse(link);

      if (!linkResult.success) {
        logger.warn('Invalid Dropbox shared link received', { link });
        continue;
      }

      validSharedLinks.push({
        ...linkResult.data,
        id: path,
      });
    }

    nextCursor = cursor;
    hasNextCursor = hasMore;
  } while (hasNextCursor);

  return filterSharedLinks(validSharedLinks);
};
