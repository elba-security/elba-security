import { HarvestError } from '@/connectors/commons/error';
import { type GetAccountResponseData } from './types';

export const getHarvestId = async (token: string) => {
  const response = await fetch(`https://id.getharvest.com/api/v2/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new HarvestError('Failed to fetch', { response });
  }
  const data = (await response.json()) as GetAccountResponseData;
  return data.accounts.at(0)?.id;
};
