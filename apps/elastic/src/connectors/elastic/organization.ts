import { z } from 'zod';
import { env } from '@/common/env';
import { ElasticError } from '../common/error';

const elasticOrganizationResponseSchema = z.object({
  organizations: z.array(
    z.object({
      id: z.string(),
    })
  ),
});
export type GetOrganizationsParams = {
  apiKey: string;
};

export const getOrganizationId = async ({ apiKey }: GetOrganizationsParams) => {
  const response = await fetch(`${env.ELASTIC_API_BASE_URL}/api/v1/organizations`, {
    method: 'GET',
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ElasticError('Could not retrieve Elastic Organization', { response });
  }
  const resData: unknown = await response.json();

  const result = elasticOrganizationResponseSchema.safeParse(resData);
  if (!result.success) {
    throw new ElasticError('Could not parse organization response');
  }

  if (!result.data.organizations[0]) {
    throw new ElasticError('No organization found');
  }

  return {
    organizationId: result.data.organizations[0].id,
  };
};
