import { z } from 'zod';
import { MakeError } from '@/connectors/common/error';

const MakeOrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const GetOrganizationsResponseSchema = z.object({
  entities: z.array(MakeOrganizationSchema),
});

export const getOrganizationIds = async (token: string, zoneDomain: string) => {
  const url = new URL(`https://${zoneDomain}/api/v2/organizations`);
  url.searchParams.append('pg[limit]', '100');
  url.searchParams.append('zone', String(zoneDomain));

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Token ${token}` },
  });

  if (!response.ok) {
    throw new MakeError('Failed to fetch', { response });
  }

  const resData: unknown = await response.json();
  const result = GetOrganizationsResponseSchema.safeParse(resData);

  if (!result.success) {
    throw new MakeError('Invalid response', { response });
  }

  return result.data.entities.map((organization) => organization.id);
};
