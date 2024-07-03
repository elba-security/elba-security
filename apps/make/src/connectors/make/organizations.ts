import { z } from 'zod';
import { MakeError } from '@/connectors/commons/error';

const MakeOrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const GetOrganizationsResponseSchema = z.object(
  {
    entities: z.array(MakeOrganizationSchema)
   }
);

export const getOrganizationIds = async (token: string, zoneDomain: string) => {
  const response = await fetch(`https://${zoneDomain}/api/v2/organizations?zone=${zoneDomain}`, {
    headers: { Authorization: `Token ${token}` },
  });

  if (!response.ok) {
    throw new MakeError('Failed to fetch', { response });
  }
  const resData: unknown = await response.json();
  const result = GetOrganizationsResponseSchema.parse(resData);

  const organizationIds: string[] = result.entities.map((organization) => organization.id);
  return organizationIds;
};
