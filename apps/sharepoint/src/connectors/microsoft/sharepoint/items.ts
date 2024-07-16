import { z } from 'zod';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import {
  getNextSkipTokenFromNextLink,
  microsoftPaginatedResponseSchema,
} from '../commons/pagination';

export const driveItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  webUrl: z.string(),
  createdBy: z.object({
    user: z.object({
      email: z.string().optional(),
      id: z.string().optional(),
      displayName: z.string(),
    }),
  }),
  lastModifiedDateTime: z.string(),
  folder: z
    .object({
      childCount: z.number(),
    })
    .optional(),
  parentReference: z.object({
    // TODO: needs this?
    id: z.string().optional(),
  }),
});

type GetItemsParams = {
  token: string;
  siteId: string;
  driveId: string;
  folderId: string | null;
  skipToken: string | null;
};

export type MicrosoftDriveItem = z.infer<typeof driveItemSchema>;

export const getItems = async ({ token, siteId, driveId, folderId, skipToken }: GetItemsParams) => {
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
    // TODO
    console.error('Failed to parse paginated items response', data);
    throw new Error('Could not parse items');
  }

  const nextSkipToken = getNextSkipTokenFromNextLink(result.data['@odata.nextLink']);
  const items: MicrosoftDriveItem[] = [];
  for (const item of result.data.value) {
    const parsedItem = driveItemSchema.safeParse(item);
    if (!parsedItem.success) {
      console.error('Failed to parse item while getting items', item);
    } else {
      items.push(parsedItem.data);
    }
  }

  return { items, nextSkipToken };
};
