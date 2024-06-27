import { z } from 'zod';
import { WebflowError } from '@/connectors/commons/error';
import { env } from '@/common/env';

const sitesSchema = z.object({
  sites: z.array(
    z.object({
      id: z.string(),
      displayName: z.string(),
    })
  ),
});

export const getSiteIds = async (token: string) => {
  const response = await fetch(`${env.WEBFLOW_API_BASE_URL}/v2/sites`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new WebflowError('Failed to fetch', { response });
  }

  const result: unknown = await response.json();
  const sitesData = sitesSchema.safeParse(result);
  if (!sitesData.success) {
    throw new WebflowError('Failed to fetch the organisation sites', { response });
  }

  const siteIds: string[] = sitesData.data.sites.map((site) => site.id);
  return siteIds;
};
