import { z } from 'zod';
import { env } from '@/common/env';
import { ClickUpError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
});

export const getAccessToken = async (code: string) => {
  const response = await fetch(`${env.CLICKUP_API_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.CLICKUP_CLIENT_ID,
      client_secret: env.CLICKUP_CLIENT_SECRET,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new ClickUpError('Failed to fetch', { response });
  }

  const data: unknown = await response.json();
  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    throw new ClickUpError('Invalid Clickup token response', { response });
  }

  return result.data.access_token;
};
