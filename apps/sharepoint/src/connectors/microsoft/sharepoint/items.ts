import { z } from 'zod';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import {
  getNextSkipTokenFromNextLink,
  type MicrosoftPaginatedResponse,
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
  url.searchParams.append(
    '$select',
    'id,folder,name,webUrl,createdBy,parentReference,lastModifiedDateTime'
  );

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

  const data = (await response.json()) as MicrosoftPaginatedResponse<MicrosoftDriveItem>;

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return { items: data.value.map((item) => driveItemSchema.parse(item)), nextSkipToken };
};
