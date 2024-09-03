import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';

const microsoftTokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
});

export const getToken = async (tenantId: string) => {
  const response = await fetch(`${env.MICROSOFT_AUTH_API_URL}/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    }),
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();
  const result = microsoftTokenSchema.safeParse(data);
  if (!result.success) {
    logger.error('Failed to parse token response', { data, error: result.error });
    throw new Error('Could not parse token');
  }

  return { token: result.data.access_token, expiresIn: result.data.expires_in };
};
