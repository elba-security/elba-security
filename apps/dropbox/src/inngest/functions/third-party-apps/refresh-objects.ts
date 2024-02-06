import { FunctionHandler, inngest } from '@/inngest/client';
import { getOrganisationAccessDetails } from '../common/data';
import { InputArgWithTrigger } from '@/inngest/types';
import { DBXApps } from '@/connectors/dropbox/dbx-apps';
import { getElba } from '@/connectors';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'third-party-apps/refresh-objects'>) => {
  const { organisationId, userId, appId } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new Error(`Organisation not found with id=${organisationId}`);
  }

  const { accessToken, region } = organisation;

  const dbxAppsFetcher = new DBXApps({
    accessToken,
  });

  const elba = getElba({
    organisationId,
    region,
  });

  await step.run('refresh-third-party-apps-objects', async () => {
    const { apps } = await dbxAppsFetcher.fetchTeamMemberThirdPartyApps(userId);

    const hasRequestedApp = apps?.some((app) => app.id === appId);

    if (!apps.length || !hasRequestedApp) {
      elba.thirdPartyApps.deleteObjects({
        ids: [
          {
            userId,
            appId,
          },
        ],
      });

      if (!apps.length) return;
    }

    await elba.thirdPartyApps.updateObjects({
      apps,
    });
  });

  return {
    success: true,
  };
};

export const refreshThirdPartyAppsObject = inngest.createFunction(
  {
    id: 'third-party-apps-refresh-objects',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 5,
      key: 'event.data.organisationId',
    },
  },
  { event: 'third-party-apps/refresh-objects' },
  handler
);
