# Refreshing token

When integrating with SaaS APIs, it's essential to ensure that the **access token** remains up-to-date. Typically, when a SaaS API grants an **access token**, it also provides an associated validity duration and a **refresh token**.

## Understanding OAuth-based Flow

Our integration strategy often follows the OAuth standards. However, it's important to note that:

- **Not all SaaS APIs provide a refresh token**: Some APIs might not offer refresh tokens and specific validity durations. In such cases, the access token can still expire and require refreshing.

- **Handling the token expiration**: For APIs that don't explicitly provide token expiration details, you can interpolate the token's duration using the information usually found in the SaaS API's documentation.

_If the integrated SaaS does not provide OAuth based authentication flow, the following examples need to be adapted._

## Refreshing the token using an Inngest function

The function start by suspending itself until some minutes before the previous token expires.

Since an organization may uninstall the SaaS integration, the Inngest function that refreshes the token should always verify the existence of the organization before proceeding to refresh the token.

After retrieving the new token and updating it in the database, it should re-trigger itself to refresh the newly retrieved token. This ensures that the access token stored in the database will always be valid.

```ts
import { subMinutes } from 'date-fns/subMinutes';
import { addSeconds } from 'date-fns/addSeconds';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { refreshToken } from '@/connectors/auth';
import { env } from '@/env';

export const refreshSaaSToken = inngest.createFunction(
  {
    id: '{SaaS}-refresh-{SaaS}-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    // this is used to prevent several loops to take place
    cancelOn: [
      {
        event: `{SaaS}/app.uninstalled`,
        match: 'data.organisationId',
      },
      {
        event: `{SaaS}/app.installed`,
        match: 'data.organisationId',
      },
    ],
    retries: env.TOKEN_REFRESH_MAX_RETRY,
  },
  { event: '{SaaS}/token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, expiresAt } = event.data;

    // wait until 5 minutes before the token expires
    await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 5));

    const nextExpiresAt = await step.run('refresh-token', async () => {
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
      const { accessToken, refreshToken, expiresIn } = await refreshToken(
        organisation.refreshToken
      );

      // update organisation accessToken & refreshToken
      await db
        .update(Organisation)
        .set({
          accessToken,
          refreshToken,
        })
        .where(eq(Organisation.id, organisationId));

      return addSeconds(new Date(), expiresIn);
    });

    // send an event that will refresh the organisation access token
    await step.sendEvent('next-refresh', {
      name: '{SaaS}/{Saas}.token.refresh.requested',
      data: {
        organisationId,
        expiresAt: nextExpiresAt,
      },
    });
  }
);
```

## Schedule the first token refresh

As mentioned previously, the Inngest function that refreshes the access token is designed to call itself, creating a loop. To initiate this loop, the integration needs to send a first event when acquiring the access token for the first time.

Since an organization's admin could sign in multiple times, it is essential for the integration to ensure that there are no multiple loops running simultaneously for a given organization. To prevent this behavior, a SaaS elba app installed event can be sent while scheduling the first token refresh. If there is a scheduled refresh token Inngest function for the organization, it will cancel itself.

```ts
// app/auth/route.ts
import { addMinutes } from 'date-fns/addMinutes';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { getToken } from '@/connectors/auth';
import { inngest } from '@/inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  region: string;
  code: string;
};

export const setupOrganisation = async ({
  organisationId,
  region,
  code,
}: SetupOrganisationParams) => {
  const { accessToken, refreshToken, expiresIn } = await getToken(code);

  await db
    .insert(Organisation)
    .values({
      id: organisationId,
      refreshToken,
      accessToken,
      region,
    })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        accessToken,
        refreshToken,
        region,
      },
    });

  await inngest.send([
    {
      name: '{SaaS}/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: 0,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: '{SaaS}/app.installed',
      data: {
        organisationId,
      },
    },
    // schedule a new token refresh loop
    {
      name: '{SaaS}/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
  ]);
};
```
