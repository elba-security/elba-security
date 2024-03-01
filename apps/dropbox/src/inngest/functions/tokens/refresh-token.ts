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
}: InputArgWithTrigger<'dropbox/token.refresh.requested'>) => {
  const { organisationId, expiresAt } = event.data;

  await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 30));

  const nextExpiresAt = await step.run('fetch-refresh-token', async () => {
    const [organisation] = await getOrganisationRefreshToken(organisationId);

    if (!organisation) {
      new NonRetriableError(
        `Not able to get the token details for the organisation with ID: ${organisationId}`
      );
    }

    const dbxAuth = new DBXAuth({
      refreshToken: organisation!.refreshToken,
    });

    const { access_token: accessToken, expires_at: expiresAt } = await dbxAuth.refreshAccessToken();

    const tokenDetails = {
      organisationId,
      accessToken: await encrypt(accessToken),
    };

    await updateDropboxTokens(tokenDetails);

    return expiresAt;
  });

  await step.sendEvent('refresh-token', {
    name: 'dropbox/token.refresh.requested',
    data: {
      organisationId,
      expiresAt: new Date(nextExpiresAt).getTime(),
    },
  });

  return {
    status: 'completed',
  };
};

export const refreshToken = inngest.createFunction(
  {
    id: 'dropbox-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: `dropbox/app.install.requested`,
        match: 'data.organisationId',
      },
      {
        event: `dropbox/app.uninstall.requested`,
        match: 'data.organisationId',
      },
    ],
    retries: env.DROPBOX_TOKEN_REFRESH_RETRIES,
  },
  { event: 'dropbox/token.refresh.requested' },
  handler
);
