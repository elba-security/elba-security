import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { LinearError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
});

export const getToken = async (code: string) => {
  const response = await fetch(`${env.LINEAR_API_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.LINEAR_CLIENT_ID,
      client_secret: env.LINEAR_CLIENT_SECRET,
      redirect_uri: env.LINEAR_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new LinearError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Linear token response', { data });
    throw new LinearError('Invalid Linear token response');
  }

  return {
    accessToken: result.data.access_token,
  };
};
