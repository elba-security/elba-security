import { z } from 'zod';
import { env } from '@/env';
import { MicrosoftError } from '../../common/error';
import {
  getNextSkipTokenFromNextLink,
  type MicrosoftPaginatedResponse,
} from '../../common/pagination';

const siteSchema = z.object({
  id: z.string(),
});

export type MicrosoftSite = z.infer<typeof siteSchema>;

export type GetSitesParams = {
  token: string;
  skipToken: string | null;
};

export const getSites = async ({ token, skipToken }: GetSitesParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/sites`);
  url.searchParams.append('search', '*');
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
    throw new MicrosoftError('Could not retrieve users', { response });
  }

  const data = (await response.json()) as MicrosoftPaginatedResponse<MicrosoftSite>;

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return { sites: data.value, nextSkipToken };
};
