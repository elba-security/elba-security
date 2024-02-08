import { addMinutes } from 'date-fns/addMinutes';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getRefreshToken } from '@/connectors/auth';
import { env } from '@/env';

export const refreshSaaSToken = inngest.createFunction(
  {
    id: 'hubspot-refresh-hubspot-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    // this is used to prevent several loops to take place
    cancelOn: [
      {
        event: `hubspot/hubspot.elba_app.uninstalled`,
        match: 'data.organisationId',
      },
      {
        event: `hubspot/hubspot.elba_app.installed`,
        match: 'data.organisationId',
      },
    ],
    retries: env.TOKEN_REFRESH_MAX_RETRY,
  },
  { event: 'hubspot/hubspot.token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, region } = event.data;

    // retrieve organisation refresh token
    const [organisation] = await db
      .select({
        refreshToken: Organisation.refreshToken,
      })
      .from(Organisation)
      .where(eq(Organisation.id, organisationId));

    if (!organisation) {
      // make sure that the function will not be retried
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    // fetch new accessToken & refreshToken using the SaaS endpoint
    const { accessToken, refreshToken, expiresIn } = await getRefreshToken(organisation.refreshToken);

    // update organisation accessToken & refreshToken
    await db
      .update(Organisation)
      .set({
        accessToken,
        refreshToken,
      })
      .where(eq(Organisation.id, organisationId));

    // send an event that will refresh the organisation access token before it expires
    await step.sendEvent('schedule-token-refresh', {
      name: 'hubspot/hubspot.token.refresh.requested',
      data: {
        organisationId,
        region,
      },
      // we schedule the event to run 5 minutes before the access token expires
      ts: addMinutes(new Date(), expiresIn - 5).getTime(),
    });
  }
);