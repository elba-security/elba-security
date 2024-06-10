import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import type { MicrosoftDriveItem } from './items';

type GetItemParams = {
  itemId: string;
  token: string;
  siteId: string;
  driveId: string;
};

export const getItem = async ({
  token,
  siteId,
  driveId,
  itemId,
}: GetItemParams): Promise<MicrosoftDriveItem | null> => {
  const url = new URL(`${env.MICROSOFT_API_URL}/sites/${siteId}/drives/${driveId}/items/${itemId}`);
  url.searchParams.append(
    '$select',
    'id,folder,name,webUrl,createdBy,parentReference,lastModifiedDateTime'
  );

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

  const item = (await response.json()) as MicrosoftDriveItem;

  return item;
};
