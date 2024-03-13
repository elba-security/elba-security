import { addSeconds, subMinutes } from 'date-fns';
import { NonRetriableError } from 'inngest';
import { env } from '@/env';
import { type FunctionHandler, inngest } from '@/inngest/client';
import { refreshAccessToken } from '@/connectors/auth';
import { type InputArgWithTrigger } from '@/inngest/types';
import { getOrganisationRefreshToken, updateOrganisationTokens } from './utils';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'heroku/token.refresh.requested'>) => {
  const { organisationId, expiresAt } = event.data;

  await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 30));

  const nextExpiresAt = await step.run('fetch-refresh-token', async () => {
    const [organisation] = await getOrganisationRefreshToken(organisationId);

    if (!organisation) {
      throw new NonRetriableError(
        `Could not get the token details for the organisation with ID: ${organisationId}`
      );
    }

    const { accessToken, expiresIn } = await refreshAccessToken(organisation.refreshToken);

    const tokenDetails = {
      organisationId,
      accessToken,
    };

    await updateOrganisationTokens(tokenDetails);

    return addSeconds(new Date(), expiresIn).getTime();
  });

  await step.sendEvent('refresh-token', {
    name: 'heroku/token.refresh.requested',
    data: {
      organisationId,
      expiresAt: nextExpiresAt,
    },
  });

  return {
    status: 'completed',
  };
};

export const refreshToken = inngest.createFunction(
  {
    id: 'heroku-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: `heroku/app.uninstall.requested`,
        match: 'data.organisationId',
      },
    ],
    retries: env.HEROKU_TOKEN_REFRESH_RETRIES,
  },
  { event: 'heroku/token.refresh.requested' },
  handler
);
