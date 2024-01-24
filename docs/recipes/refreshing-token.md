# Refreshing token

When integrating with SaaS APIs, it's essential to ensure that the **access token** remains up-to-date. Typically, when a SaaS API grants an **access token**, it also provides an associated validity duration and a **refresh token**.

## Understanding OAuth-based Flow

Our integration strategy often follows the OAuth standards. However, it's important to note that:

- **Not all SaaS APIs provide refresh token**: Some APIs might not offer refresh tokens and specific validity durations. In such cases, the access token can still expire and require refreshing.

- **Handling token expiration**: For APIs that don't explicitly provide token expiration details, you can interpolate the token's duration using the information usually found in the SaaS API's documentation.

_If the integrated SaaS does not provide OAuth based authentication flow, the following examples need to be adapted._

## Refreshing the token using an Inngest function

As an organisation can uninstall the SaaS integration, the Inngest function that refreshes the token should always verify that the organisation still exists before proceeding.

After retrieving the new token and updating it in the database, the function should schedule itself to run again in the future, before the new token expires. This ensures that the access token stored in the database will always be valid.

```ts
import { addMinutes } from 'date-fns/addMinutes';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { refreshToken } from '@/connectors/auth';
import { env } from '@/env';

export const refreshToken = inngest.createFunction(
  {
    id: '{SaasName}/refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    // this is used to prevent several loops to take place
    cancelOn: [
      {
        event: `{SaasName}/token.refresh.canceled`,
        match: 'data.organisationId',
      },
    ],
    retries: env.TOKEN_REFRESH_MAX_RETRY,
  },
  { event: '{SaasName}/token.refresh.triggered' },
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
    const { accessToken, refreshToken, expiresIn } = await refreshToken(organisation.refreshToken);

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
      name: '{SaasName}/token.refresh.triggered',
      data: {
        organisationId,
        region,
      },
      // we schedule the event to run 5 minutes before the access token expires
      ts: addMinutes(new Date(), expiresIn - 5).getTime(),
    });
  }
);
```

## Plan the first token refreshing

As mentioned previously, the Inngest function that refreshes the access token is designed to call itself, creating a loop. To initiate this loop, the integration needs to send a first event when acquiring the access token for the first time.

Since an organization's admin could sign in multiple times, it is essential for the integration to ensure that there are no multiple loops running simultaneously for a given organization. To prevent this behavior, a cancel event can be sent while scheduling the first token refresh.

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
      name: '{saasName}/users.sync_page.triggered',
      data: {
        organisationId,
        region,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: 0,
      },
    },
    // cancel scheduled token refresh if it exists
    {
      name: '{saasName}/token.refresh.canceled',
      data: {
        organisationId,
        region,
      },
    },
    // schedule a new token refresh loop
    {
      name: '{saasName}/token.refresh.triggered',
      data: {
        organisationId,
        region,
      },
      // we schedule a token refresh 5 minutes before it expires
      ts: addMinutes(new Date(), expiresIn - 5).getTime(),
    },
  ]);
};
```
