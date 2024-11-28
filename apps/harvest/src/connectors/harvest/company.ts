import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env/server';
import { HarvestError } from '../common/error';

const companyDomainResponseSchema = z.object({
  full_domain: z.string(),
});

export const getCompanyDomain = async (accessToken: string) => {
  const url = new URL(`${env.HARVEST_API_BASE_URL}/company`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new HarvestError('Could not retrieve company domain', { response });
  }

  const resData: unknown = await response.json();

  const result = companyDomainResponseSchema.safeParse(resData);

  if (!result.success) {
    logger.error('Invalid Harvest company domain response', { resData });
    throw new HarvestError('Invalid Harvest company domain response');
  }

  return {
    companyDomain: result.data.full_domain,
  };
};
