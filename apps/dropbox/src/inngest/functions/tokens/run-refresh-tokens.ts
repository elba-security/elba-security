import { getOrganisationRefreshToken, updateDropboxTokens } from './data';
import { InputArgWithTrigger } from '@/inngest/types';
import subMinutes from 'date-fns/subMinutes';
import { FunctionHandler, inngest } from '@/inngest/client';
import { DBXAuth } from '@/connectors';
import { NonRetriableError } from 'inngest';
import { encrypt } from '@/common/crypto';
import { env } from '@/env';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'dropbox/token.refresh.triggered'>) => {
  const { organisationId } = event.data;

  const response = await step.run('fetch-refresh-token', async () => {
    const organisation = await getOrganisationRefreshToken(organisationId);

    if (!organisation.length) {
      new NonRetriableError(
        `Not able to get the token details for the organisation with ID: ${organisationId}`
      );
    }

    const token = organisation.at(0);

    const dbxAuth = new DBXAuth({
      refreshToken: token!.refreshToken,
    });

    const { access_token: accessToken, expires_at: expiresAt } = await dbxAuth.refreshAccessToken();

    const tokenDetails = {
      organisationId,
      expiresAt,
      accessToken: await encrypt(accessToken),
    };

    await updateDropboxTokens(tokenDetails);

    return tokenDetails;
  });

  await step.sendEvent('run-refresh-token', {
    name: 'dropbox/token.refresh.triggered',
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
  {
    id: 'run-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: `dropbox/token.refresh.canceled`,
        match: 'data.organisationId',
      },
    ],
    retries: env.TOKEN_REFRESH_MAX_RETRY,
  },
  { event: 'dropbox/token.refresh.triggered' },
  handler
);
