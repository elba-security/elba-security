import { z } from 'zod';
import { env } from '@/common/env';
import { AircallError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
});

export const getToken = async (code: string) => {
  const response = await fetch(`${env.AIRCALL_API_BASE_URL}/v1/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.AIRCALL_CLIENT_ID,
      client_secret: env.AIRCALL_CLIENT_SECRET,
      redirect_uri: env.AIRCALL_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new AircallError('Could not retrieve token', { response });
  }

  const respData: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(respData);

  if (!result.success) {
    throw new AircallError('Could not retrieve token', { response });
  }

  return {
    accessToken: result.data.access_token,
  };
};
