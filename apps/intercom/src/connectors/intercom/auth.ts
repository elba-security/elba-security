import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { IntercomError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
});

export const getToken = async (code: string) => {
  const response = await fetch(`${env.INTERCOM_API_BASE_URL}/auth/eagle/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.INTERCOM_CLIENT_ID,
      client_secret: env.INTERCOM_CLIENT_SECRET,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new IntercomError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Intercom token response', { data });
    throw new IntercomError('Invalid Intercom token response');
  }

  return {
    accessToken: result.data.access_token,
  };
};
