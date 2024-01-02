import { FunctionHandler, inngest } from '@/common/clients/inngest';
import { DBXAuth } from '@/repositories/dropbox/clients';
import { updateDropboxTokens } from './data';
import { DropboxResponseError } from 'dropbox';
import { addMinutes } from 'date-fns';
import { InputArgWithTrigger } from '@/common/clients/types';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'tokens/run-refresh-tokens'>) => {
  const { organisationId, refreshToken } = event.data;

  await step.run('fetch-refresh-token', async () => {
    const dbxAuth = new DBXAuth({
      refreshToken,
    });

    try {
      const response = await dbxAuth.refreshAccessToken();

      await updateDropboxTokens({
        organisationId,
        expiresAt: response.expires_at,
        accessToken: response.access_token,
      });

      return {
        success: true,
      };
    } catch (error) {
      if (error instanceof DropboxResponseError) {
        const { status, error: innerError } = error;
        if (status === 401) {
          await updateDropboxTokens({
            organisationId,
            refreshAfter: null,
            unauthorizedAt: new Date(),
          });
        }

        if (status === 429) {
          const {
            error: { retry_after: retryAfter },
          } = innerError;

          await updateDropboxTokens({
            organisationId: organisationId,
            refreshAfter: addMinutes(new Date(Date.now()), retryAfter * 1000),
            unauthorizedAt: null,
          });
        }

        return {
          success: true,
        };
      }

      throw error;
    }
  });
};

export const runRefreshToken = inngest.createFunction(
  { id: 'run-refresh-tokens' },
  { event: 'tokens/run-refresh-tokens' },
  handler
);
