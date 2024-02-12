import { getElba } from '@/connectors/elba/client';
import { InputArgWithTrigger } from '@/inngest/types';
import { getOrganisationAccessDetails } from '../common/data';
import { FunctionHandler, inngest } from '@/inngest/client';
import { DBXUsers } from '@/connectors';
import { decrypt } from '@/common/crypto';
import { logger } from '@elba-security/logger';
import { env } from '@/env';
import { NonRetriableError } from 'inngest';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'dropbox/users.sync_page.triggered'>) => {
  const { organisationId, syncStartedAt, cursor } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new NonRetriableError(
      `Access token not found for organisation with ID: ${organisationId}`
    );
  }

  const { accessToken, region } = organisation;
  const token = await decrypt(accessToken);

  const elba = getElba({
    organisationId,
    region,
  });

  const users = await step.run('user-sync-initialize', async () => {
    const dbx = new DBXUsers({
      accessToken: token,
    });

    const { members, ...rest } = await dbx.fetchUsers(cursor);

    if (members.length > 0) {
      await elba.users.update({
        users: members,
      });
    }

    return rest;
  });

  if (users?.hasMore) {
    return await step.sendEvent('run-user-sync-job', {
      name: 'dropbox/users.sync_page.triggered',
      data: { ...event.data, cursor: users.nextCursor },
    });
  }

  await step.run('user-sync-finalize', async () => {
    const syncedBefore = new Date(syncStartedAt);
    logger.info('Deleting old users on elba', { organisationId, syncedBefore });
    await elba.users.delete({
      syncedBefore: syncedBefore.toISOString(),
    });
  });
};

export const syncUserPage = inngest.createFunction(
  {
    id: 'dropbox-sync-user-page',
    retries: env.DROPBOX_USER_SYNC_RETRIES,
    concurrency: {
      limit: env.DROPBOX_USER_SYNC_CONCURRENCY,
      key: 'event.data.organisationId',
    },
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
  },
  { event: 'dropbox/users.sync_page.triggered' },
  handler
);
