import { FunctionHandler, inngest } from '@/common/clients/inngest';
import { DBXAuth } from '@/repositories/dropbox/clients';
import { getOrganisationRefreshToken, updateDropboxTokens } from './data';
import { InputArgWithTrigger } from '@/common/clients/types';
import subMinutes from 'date-fns/subMinutes';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'tokens/run-refresh-token'>) => {
  const { organisationId } = event.data;

  const response = await step.run('fetch-refresh-token', async () => {
    const [token] = await getOrganisationRefreshToken(organisationId);

    if (!token) {
      throw new Error(
        `Not able to get the token details for the organisation with ID: ${organisationId}`
      );
    }

    const dbxAuth = new DBXAuth({
      refreshToken: token.refreshToken,
    });

    const { access_token: accessToken, expires_at: expiresAt } = await dbxAuth.refreshAccessToken();

    const tokenDetails = {
      organisationId,
      expiresAt,
      accessToken,
    };

    await updateDropboxTokens(tokenDetails);

    return tokenDetails;
  });

  await step.sendEvent('run-refresh-token', {
    name: 'tokens/run-refresh-token',
    data: {
      organisationId,
    },
    ts: subMinutes(new Date(response.expiresAt), 30).getTime(),
  });

  return {
    success: true,
  };
};

export const runRefreshToken = inngest.createFunction(
  { id: 'run-refresh-token' },
  { event: 'tokens/run-refresh-token' },
  handler
);
