import { inngest } from '@/common/clients/inngest';
import { DBXAuth } from '@/repositories/dropbox/clients';
import { updateDropboxTokens } from './data';
import { DropboxResponseError } from 'dropbox';
import { addMinutes } from 'date-fns';

export type RefreshTokenResult =
  | {
      organisationId: string;
      refreshAfter: string | null;
      unauthorizedAt: string | null;
    }
  | {
      organisationId: string;
      expiresAt: string;
      accessToken: string;
    };

const fetchRefreshTokens = async ({
  organisationId,
  refreshToken,
}: {
  organisationId: string;
  refreshToken: string;
}): Promise<RefreshTokenResult> => {
  const dbxAuth = new DBXAuth({
    refreshToken,
  });

  try {
    const response = await dbxAuth.refreshAccessToken();

    return {
      organisationId,
      expiresAt: response.expires_at.toISOString(),
      accessToken: response.access_token,
    };
  } catch (error) {
    if (error instanceof DropboxResponseError) {
      if (error.status === 401) {
        return {
          organisationId,
          refreshAfter: null,
          unauthorizedAt: new Date(Date.now()).toISOString(),
        };
      }

      if (error.status === 429) {
        const retryAfter = error.headers['Retry-After'];

        return {
          organisationId: organisationId,
          refreshAfter: addMinutes(new Date(Date.now()), retryAfter * 1000).toISOString(),
          unauthorizedAt: null,
        };
      }
    }

    throw error;
  }
};

const handler: Parameters<typeof inngest.createFunction>[2] = async ({ event, step }) => {
  const { organisationId, refreshToken } = event.data;

  const refreshedToken = await fetchRefreshTokens({
    organisationId,
    refreshToken,
  });

  await updateDropboxTokens(refreshedToken);

  return {
    success: true,
  };
};

export const runRefreshToken = inngest.createFunction(
  { id: 'run-refresh-tokens' },
  { event: 'tokens/run-refresh-tokens' },
  handler
);
