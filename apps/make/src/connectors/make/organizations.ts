import { z } from 'zod';
import { MakeError } from '../common/error';

const makeOrganizationsResponseSchema = z.object({
  organizations: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      zone: z.string(),
    })
  ),
});

export type GetOrganizationsParams = {
  apiToken: string;
  zoneDomain: string | null;
};

export const getOrganizations = async ({ apiToken, zoneDomain }: GetOrganizationsParams) => {
  const endpoint = new URL(`https://${zoneDomain}/api/v2/organizations`);

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Token ${apiToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new MakeError('API request failed', { response });
  }

  const resData: unknown = await response.json();

  const result = makeOrganizationsResponseSchema.safeParse(resData);

  if (!result.success) {
    throw new MakeError('Invalid data response', { response });
  }

  return {
    organizations: result.data.organizations,
  };
};
