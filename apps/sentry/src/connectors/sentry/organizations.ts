import { z } from 'zod';
import { IntegrationError, IntegrationConnectionError } from '@elba-security/common';
import { env } from '@/common/env';

const organizationSchema = z.object({
  slug: z.string(),
  name: z.string(),
});

export const getOrganization = async (accessToken: string) => {
  const response = await fetch(`${env.SENTRY_API_BASE_URL}/organizations/`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', {
        response,
        type: 'unauthorized',
      });
    }
    throw new IntegrationError('Could not retrieve organization', { response });
  }

  const data: unknown = await response.json();

  // API key requests return only one organization
  const organizations = z.array(organizationSchema).parse(data);

  if (organizations.length === 0) {
    throw new IntegrationError('No organization found for this API key', {
      response,
    });
  }

  // We know there's at least one organization because we checked the length
  const organization = organizations[0];
  if (!organization) {
    throw new IntegrationError('Organization data is invalid', { response });
  }
  return organization;
};
