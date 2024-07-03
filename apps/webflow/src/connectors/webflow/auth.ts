import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { WebflowError } from '../commons/error';

const accessTokenSchema = z.object({
  access_token: z.string(),
});

export const getAccessToken = async (code: string) => {
  const url = `${env.WEBFLOW_API_BASE_URL}/oauth/access_token`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: env.WEBFLOW_CLIENT_ID,
      client_secret: env.WEBFLOW_CLIENT_SECRET,
      redirect_uri: env.WEBFLOW_REDIRECT_URI,
      code,
    }),
  });

  if (!response.ok) {
    throw new WebflowError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = accessTokenSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Zoom token response', { data });
    throw new WebflowError('Invalid Webflow token response');
  }

  return result.data.access_token;
};
