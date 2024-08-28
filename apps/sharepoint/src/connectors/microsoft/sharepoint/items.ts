import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import { microsoftPaginatedResponseSchema } from '../common/pagination';

export const driveItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  webUrl: z.string(),
  createdBy: z.object({
    user: z.object({
      id: z.string().optional(),
    }),
  }),
  lastModifiedDateTime: z.string(),
  folder: z
    .object({
      childCount: z.number(),
    })
    .optional(),
  parentReference: z.object({
    id: z.string().optional(),
  }),
  shared: z.object({}).optional(),
});

export type MicrosoftDriveItem = z.infer<typeof driveItemSchema>;

export const getItem = async ({
  token,
  siteId,
  driveId,
  itemId,
}: {
  itemId: string;
  token: string;
  siteId: string;
  driveId: string;
}): Promise<MicrosoftDriveItem | null> => {
  const url = new URL(`${env.MICROSOFT_API_URL}/sites/${siteId}/drives/${driveId}/items/${itemId}`);
  url.searchParams.append('$select', Object.keys(driveItemSchema.shape).join(','));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve item', { response });
  }

  const data: unknown = await response.json();
  const result = driveItemSchema.safeParse(data);
  if (!result.success) {
    logger.error('Failed to parse item', { data, error: result.error });
    throw new Error('Could not parse item while getting item');
  }

  return result.data;
};

export const getItems = async ({
  token,
  siteId,
  driveId,
  folderId,
  skipToken,
}: {
  token: string;
  siteId: string;
  driveId: string;
  folderId: string | null;
  skipToken: string | null;
}) => {
  const urlEnding = folderId ? `items/${folderId}/children` : 'root/children';

  const url = new URL(`${env.MICROSOFT_API_URL}/sites/${siteId}/drives/${driveId}/${urlEnding}`);
  url.searchParams.append('$top', String(env.MICROSOFT_DATA_PROTECTION_ITEM_SYNC_SIZE));
  url.searchParams.append('$select', Object.keys(driveItemSchema.shape).join(','));

  if (skipToken) {
    url.searchParams.append('$skiptoken', skipToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve items', { response });
  }

  const data: unknown = await response.json();
  const result = microsoftPaginatedResponseSchema.safeParse(data);
  if (!result.success) {
    logger.error('Failed to parse paginated items response', { data, error: result.error });
    throw new Error('Could not parse items');
  }

  const items: MicrosoftDriveItem[] = [];
  for (const item of result.data.value) {
    const parsedItem = driveItemSchema.safeParse(item);
    if (!parsedItem.success) {
      logger.error('Failed to parse item while getting items', { item, error: parsedItem.error });
    } else {
      items.push(parsedItem.data);
    }
  }

  return { items, nextSkipToken: result.data['@odata.nextLink'] };
};
