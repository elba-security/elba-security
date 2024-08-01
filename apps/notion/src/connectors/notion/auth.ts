import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { NotionError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
});

export const getToken = async (code: string) => {
  const encodedKey = btoa(`${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`);

  const response = await fetch(`${env.NOTION_API_BASE_URL}/v1/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encodedKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      redirect_uri: env.NOTION_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw new NotionError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Notion token response', { data });
    throw new NotionError('Invalid Notion token response');
  }

  return {
    accessToken: result.data.access_token,
  };
};
