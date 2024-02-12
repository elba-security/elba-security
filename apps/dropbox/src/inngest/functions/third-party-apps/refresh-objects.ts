import { FunctionHandler, inngest } from '@/inngest/client';
import { getOrganisationAccessDetails } from '../common/data';
import { InputArgWithTrigger } from '@/inngest/types';
import { DBXApps } from '@/connectors/dropbox/dbx-apps';
import { getElba } from '@/connectors';
import { decrypt } from '@/common/crypto';
import { env } from '@/env';
import { NonRetriableError } from 'inngest';

const handler: FunctionHandler = async ({
  event,
}: InputArgWithTrigger<'dropbox/third_party_apps.refresh_objects.requested'>) => {
  const { organisationId, userId, appId } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new NonRetriableError(`Organisation not found with id=${organisationId}`);
  }

  const { accessToken, region } = organisation;

  const token = await decrypt(accessToken);

  const dbxAppsFetcher = new DBXApps({
    accessToken: token,
  });

  const elba = getElba({
    organisationId,
    region,
  });

  const { apps } = await dbxAppsFetcher.fetchTeamMemberThirdPartyApps(userId);

  const hasRequestedApp = apps?.some((app) => app.id === appId);

  if (!apps.length || !hasRequestedApp) {
    await elba.thirdPartyApps.deleteObjects({
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
};

export const refreshThirdPartyAppsObject = inngest.createFunction(
  {
    id: 'dropbox-third-party-apps-refresh-objects',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: env.DROPBOX_TPA_REFRESH_OBJECT_RETRIES,
    concurrency: {
      limit: env.DROPBOX_TPA_REFRESH_OBJECT_CONCURRENCY,
      key: 'event.data.organisationId',
    },
  },
  { event: 'dropbox/third_party_apps.refresh_objects.requested' },
  handler
);
