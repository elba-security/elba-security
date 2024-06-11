import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { HubspotError } from '../common/error';

const getAccountResponseSchema = z.object({
  timeZone: z.string(),
});

export const getAccountTimezone = async (token: string) => {
  const response = await fetch(`${env.HUBSPOT_API_BASE_URL}/account-info/v3/details`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new HubspotError('Could not retrieve users', { response });
  }
  const data: unknown = await response.json();

  const result = getAccountResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Hubspot timezone response', { data });
    throw new HubspotError('Invalid Hubspot timezone response', { cause: result.error });
  }

  return result.data.timeZone;
};
