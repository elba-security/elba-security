import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env/server';
import { MondayError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
});

export const getToken = async (code: string) => {
  const response = await fetch(`${env.MONDAY_APP_INSTALL_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: env.NEXT_PUBLIC_MONDAY_CLIENT_ID,
      client_secret: env.MONDAY_CLIENT_SECRET,
      redirect_uri: env.MONDAY_REDIRECT_URI,
      code,
    }),
  });

  if (!response.ok) {
    throw new MondayError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Monday token response', { data });
    throw new MondayError('Invalid Monday token response');
  }

  return {
    accessToken: result.data.access_token,
  };
};
