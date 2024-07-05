import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { ZendeskError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
});

export type GetTokenParams = {
  code: string;
  subDomain: string;
};

export const getToken = async ({ code, subDomain }: GetTokenParams) => {
  const response = await fetch(`${subDomain}/oauth/tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      scope: 'users:read users:write tickets:read',
      client_id: `${env.ZENDESK_CLIENT_ID}`,
      client_secret: `${env.ZENDESK_CLIENT_SECRET}`,
      redirect_uri: env.ZENDESK_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new ZendeskError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Zendesk token response', { data });
    throw new ZendeskError('Invalid Zendesk token response');
  }

  return {
    accessToken: result.data.access_token,
  };
};
