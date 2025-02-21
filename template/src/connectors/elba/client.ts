import { Elba } from '@elba-security/sdk';
import { env } from '@/common/env';

/**
 * Creates an Elba client instance for organization-specific operations.
 * This client is used for operations that require an organization context,
 * such as updating connection status or syncing data.
 *
 * Required environment variables:
 * - ELBA_API_KEY: Your Elba API key
 * - ELBA_API_BASE_URL: The base URL for Elba's API
 *
 * @param params.organisationId - The Elba organization ID
 * @param params.region - The region (e.g., "eu", "us")
 * @returns An initialized Elba client for the specified organization
 */
export const createElbaOrganisationClient = ({
  organisationId,
  region,
}: {
  organisationId: string;
  region: string;
}) => {
  return new Elba({
    organisationId,
    apiKey: env.ELBA_API_KEY,
    baseUrl: env.ELBA_API_BASE_URL,
    region,
  });
};

/**
 * Creates an Elba client instance for global operations.
 * This client is used for operations that don't require an organization context,
 * such as listing organisations.
 *
 * Required environment variables:
 * - ELBA_API_KEY: Your Elba API key
 * - ELBA_API_BASE_URL: The base URL for Elba's API
 *
 * @param region - The region (e.g., "eu", "us")
 * @returns An initialized Elba client without organization context
 */
export const createElbaGlobalClient = (region: string) => {
  return new Elba({
    apiKey: env.ELBA_API_KEY,
    baseUrl: env.ELBA_API_BASE_URL,
    region,
  });
};
