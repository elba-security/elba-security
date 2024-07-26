import { z } from 'zod';
import { env } from '@/common/env';
import { DropboxError } from '../common/error';

const dropboxTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

const appCredentials = {
  client_id: env.DROPBOX_CLIENT_ID,
  client_secret: env.DROPBOX_CLIENT_SECRET,
};

export const getToken = async (code: string) => {
  const response = await fetch(`${env.DROPBOX_API_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      ...appCredentials,
      grant_type: 'authorization_code',
      redirect_uri: env.DROPBOX_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    throw await DropboxError.fromResponse('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = dropboxTokenSchema.safeParse(data);

  if (!result.success) {
    throw new Error('Invalid Dropbox token response', { cause: result.error });
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
};

export const getRefreshToken = async (prevRefreshToken: string) => {
  const response = await fetch(`${env.DROPBOX_API_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      ...appCredentials,
      grant_type: 'refresh_token',
      refresh_token: prevRefreshToken,
    }).toString(),
  });

  if (!response.ok) {
    throw await DropboxError.fromResponse('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = dropboxTokenSchema.omit({ refresh_token: true }).safeParse(data);

  if (!result.success) {
    throw new Error('Invalid Dropbox refresh token response', { cause: result.error });
  }

  return {
    accessToken: result.data.access_token,
    expiresIn: result.data.expires_in,
  };
};
