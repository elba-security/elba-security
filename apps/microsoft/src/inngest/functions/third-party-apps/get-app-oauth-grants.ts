import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import * as appsService from '@/connectors/microsoft/apps';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { env } from '@/env';
import { decrypt } from '@/common/crypto';

export const getAppOauthGrants = inngest.createFunction(
  {
    id: 'microsoft-get-app-oauth-grants',
    cancelOn: [
      {
        event: 'microsoft/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'microsoft/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  {
    event: 'microsoft/third_party_apps.get_app_oauth_grants.requested',
    concurrency: [
      {
        key: 'event.data.organisationId',
        limit: env.THIRD_PARTY_APPS_SYNC_BATCH_SIZE,
      },
      {
        key: 'event.data.appId + "-" + event.data.organisationId',
        limit: 1,
      },
    ],
  },
  async ({ step, event, logger }): Promise<appsService.MicrosoftAppOauthGrant[]> => {
    const { organisationId, appId, skipToken } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
        tenantId: organisationsTable.tenantId,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const { grants, nextSkipToken } = await step.run('paginate', async () => {
      const result = await appsService.getAppOauthGrants({
        token: await decrypt(organisation.token),
        tenantId: organisation.tenantId,
        skipToken,
        appId,
      });

      if (result.invalidAppOauthGrants.length > 0) {
        logger.warn('Retrieved app oauth grants contains invalid data', {
          organisationId,
          tenantId: organisation.tenantId,
          invalidAppOauthGrants: result.invalidAppOauthGrants,
        });
      }

      return {
        grants: result.validAppOauthGrants,
        nextSkipToken: result.nextSkipToken,
      };
    });

    if (nextSkipToken) {
      const nextPagesGrants = await step.invoke('get-next-app-oauth-grants-page', {
        function: getAppOauthGrants,
        data: {
          organisationId,
          appId,
          skipToken: nextSkipToken,
        },
      });

      return [...grants, ...nextPagesGrants];
    }

    return grants;
  }
);
