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
  step,
}: InputArgWithTrigger<'dropbox/third_party_apps.sync_page.triggered'>) => {
  const { organisationId, cursor, syncStartedAt } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new NonRetriableError(
      `Access token not found for organisation with ID: ${organisationId}`
    );
  }

  const { accessToken, region } = organisation;
  const token = await decrypt(accessToken);

  const dbx = new DBXApps({
    accessToken: token,
  });

  const elba = getElba({
    organisationId,
    region,
  });

  const result = await step.run('third-party-apps-sync-initialize', async () => {
    const { apps, ...rest } = await dbx.fetchTeamMembersThirdPartyApps(cursor);

    if (!apps?.length) {
      return rest;
    }

    await elba.thirdPartyApps.updateObjects({
      apps,
    });

    return rest;
  });

  if (result?.hasMore) {
    return await step.sendEvent('third-party-apps-run-sync-jobs', {
      name: 'dropbox/third_party_apps.sync_page.triggered',
      data: {
        ...event.data,
        cursor: result.nextCursor,
      },
    });
  }

  await step.run('third-party-apps-sync-finalize', async () => {
    return elba.thirdPartyApps.deleteObjects({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });
  });
};

export const syncApps = inngest.createFunction(
  {
    id: 'dropbox-sync-apps',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: env.DROPBOX_TPA_SYNC_RETRIES,
    concurrency: {
      limit: env.DROPBOX_TPA_SYNC_CONCURRENCY,
      key: 'event.data.organisationId',
    },
  },
  { event: 'dropbox/third_party_apps.sync_page.triggered' },
  handler
);
