import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { HubspotError } from './common/error';

const getAccountInfoResponseSchema = z.object({
  timeZone: z.string(),
  portalId: z.number().int().min(0),
  uiDomain: z.string(),
});

export const getAccountInfo = async (token: string) => {
  const response = await fetch(`${env.HUBSPOT_API_BASE_URL}/account-info/v3/details`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new HubspotError('Could not retrieve account info', { response });
  }
  const data: unknown = await response.json();

  const result = getAccountInfoResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Could not validate account info response data', { data, error: result.error });
    throw new Error('Could not validate account info response data', { cause: result.error });
  }

  return result.data;
};
