import { HarvestError } from '@/connectors/commons/error';
import { env } from '@/env';
import { type GetAccountResponseData } from './types';

export const getHarvestId = async (token: string) => {
  const response = await fetch(`${env.HARVEST_AUTH_BASE_URL}/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new HarvestError('Failed to fetch', { response });
  }
  const data = (await response.json()) as GetAccountResponseData;
  return data.accounts.at(0)?.id;
};
