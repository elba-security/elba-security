import { FunctionHandler, inngest } from '@/inngest/client';
import { InputArgWithTrigger } from '@/inngest/types';
import { getOrganisationAccessDetails } from '../common/data';
import { DBXFiles } from '@/connectors';
import { insertSharedLinks } from './data';
import { decrypt } from '@/common/crypto';
import { NonRetriableError } from 'inngest';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'dropbox/data_protection.shared_links.sync_page.requested'>) => {
  const { organisationId, cursor, teamMemberId, isPersonal, pathRoot } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new NonRetriableError(
      `Access token not found for organisation with ID: ${organisationId}`
    );
  }

  const token = await decrypt(organisation.accessToken);

  const dbx = new DBXFiles({
    accessToken: token,
    teamMemberId,
    pathRoot,
  });

  const sharedLinks = await step.run('fetch-shared-links', async () => {
    return await dbx.fetchSharedLinks({
      isPersonal,
      cursor,
    });
  });

  if (!sharedLinks) {
    throw new Error(`SharedLinks is undefined for the organisation ${organisationId}`);
  }

  if (sharedLinks.links.length > 0) {
    await step.run('insert-shared-links', async () => {
      const links = sharedLinks.links.map((link) => ({ ...link, organisationId, teamMemberId }));
      await insertSharedLinks(links);
    });
  }

  if (sharedLinks?.hasMore) {
    return await step.sendEvent('sync-shared-links', {
      name: 'dropbox/data_protection.shared_links.sync_page.requested',
      data: {
        ...event.data,
        cursor: sharedLinks.nextCursor!,
      },
    });
  }

  await step.sendEvent(`wait-for-shared-links-to-be-fetched`, {
    name: 'dropbox/data_protection.synchronize_shared_links.sync_page.completed',
    data: {
      ...event.data,
    },
  });
};

export const synchronizeSharedLinks = inngest.createFunction(
  {
    id: 'dropbox-sync-shared-links-page',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 10,
      key: 'event.data.organisationId',
    },
  },
  { event: 'dropbox/data_protection.shared_links.sync_page.requested' },
  handler
);
