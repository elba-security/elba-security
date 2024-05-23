import { WebflowError } from '@/connectors/commons/error';
import { type GetSiteResponseData } from './types';

export const getSiteId = async (token: string) => {
  const response = await fetch(`https://api.webflow.com/v2/sites`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new WebflowError('Failed to fetch', { response });
  }
  const data = (await response.json()) as GetSiteResponseData;
  return data.sites.at(0)?.id;
};
