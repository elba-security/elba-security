import { z } from 'zod';
import { env } from '@/env';
import { MicrosoftError } from '../../common/error';
import type { MicrosoftPaginatedResponse } from '../../common/pagination';
import { getNextSkipTokenFromNextLink } from '../../common/pagination';

const driveSchema = z.object({
  id: z.string(),
});

export type MicrosoftDrive = z.infer<typeof driveSchema>;

export type GetDrivesParams = {
  token: string;
  siteId: string;
  skipToken: string | null;
};

export const getDrives = async ({ token, siteId, skipToken }: GetDrivesParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/sites/${siteId}/drives`);
  url.searchParams.append('$top', String(env.MICROSOFT_DATA_PROTECTION_SYNC_CHUNK_SIZE));
  url.searchParams.append('$select', 'id');

  if (skipToken) {
    url.searchParams.append('$skiptoken', skipToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve drives', { response });
  }

  const data = (await response.json()) as MicrosoftPaginatedResponse<MicrosoftDrive>;

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return { drives: data.value, nextSkipToken };
};
