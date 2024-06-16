import { MakeError } from '@/connectors/commons/error';
import type { GetEntityResponseData } from '../types';

export const getOrganizationIds = async (token: string, zoneDomain: string) => {
  const response = await fetch(`https://${zoneDomain}/api/v2/organizations?zone=${zoneDomain}`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!response.ok) {
    throw new MakeError('Failed to fetch', { response });
  }
  const data = (await response.json()) as GetEntityResponseData;

  const organizationIds: string[] = data.entities.map((organization) => organization.id);
  return organizationIds;
};