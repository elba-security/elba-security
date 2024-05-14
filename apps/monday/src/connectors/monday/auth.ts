import { z } from 'zod';
import { env } from '@/common/env';
import { MondayError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
});

export type GetTokenResponseData = z.infer<typeof tokenResponseSchema>;

export const getToken = async (
  code: string
): Promise<{
  access_token: string;
}> => {
  const response = await fetch(`${env.MONDAY_AUTH_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({
      client_id: env.MONDAY_CLIENT_ID,
      client_secret: env.MONDAY_CLIENT_SECRET,
      code,
      redirect_uri: env.MONDAY_REDIRECT_URL,
    }),
  });

  if (!response.ok) {
    throw new MondayError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const tokenResponse = tokenResponseSchema.safeParse(data);

  if (!tokenResponse.success) {
    throw new Error('Could not parse token response', {
      cause: tokenResponse.error,
    });
  }

  return {
    access_token: tokenResponse.data.access_token,
  };
};
