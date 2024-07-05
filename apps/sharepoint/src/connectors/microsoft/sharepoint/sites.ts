import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import { microsoftPaginatedResponseSchema } from '../common/pagination';

const siteSchema = z.object({
  id: z.string(),
});

type GetSitesParams = {
  token: string;
  skipToken: string | null;
};

export type MicrosoftSite = z.infer<typeof siteSchema>;

export const getSites = async ({ token, skipToken }: GetSitesParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/sites`);
  url.searchParams.append('search', '*');
  url.searchParams.append('$top', String(env.MICROSOFT_DATA_PROTECTION_SYNC_CHUNK_SIZE));
  url.searchParams.append('$select', Object.keys(siteSchema.shape).join(','));

  if (skipToken) {
    url.searchParams.append('$skiptoken', skipToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve sites', { response });
  }

  const data: unknown = await response.json();
  const result = microsoftPaginatedResponseSchema.safeParse(data);
  if (!result.success) {
    logger.error('Failed to parse sites', { data, error: result.error });
    throw new Error('Could not parse sites');
  }

  const nextSkipToken = result.data['@odata.nextLink'];
  const siteIds: string[] = [];
  for (const site of result.data.value) {
    const parsedSite = siteSchema.safeParse(site);
    if (!parsedSite.success) {
      logger.error('Failed to parse site while getting sites', { site, error: parsedSite.error });
    } else {
      siteIds.push(parsedSite.data.id);
    }
  }

  return { siteIds, nextSkipToken };
};
