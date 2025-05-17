import { getSharedLinks } from '@/connectors/dropbox/shared-links';
import { insertSharedLinks } from '@/database/shared-links';
import { inngest } from '@/inngest/client';
import { nangoAPIClient } from '@/common/nango';

export const syncSharedLinks = inngest.createFunction(
  {
    id: 'dropbox-sync-shared-links',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 5,
    concurrency: {
      limit: 10,
      key: 'event.data.organisationId',
    },
  },
  { event: 'dropbox/data_protection.shared_links.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, cursor, teamMemberId, isPersonal, pathRoot, nangoConnectionId } =
      event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

    const accessToken = credentials.access_token;

    const { links: sharedLinks, nextCursor } = await step.run('fetch-shared-links', async () => {
      return await getSharedLinks({
        accessToken,
        teamMemberId,
        isPersonal,
        pathRoot,
        cursor,
      });
    });

    if (sharedLinks.length > 0) {
      await step.run('insert-shared-links', async () => {
        const links = sharedLinks.map((link) => ({ ...link, organisationId, teamMemberId }));
        await insertSharedLinks(links);
      });
    }

    if (nextCursor) {
      await step.sendEvent('sync-shared-links-next-page', {
        name: 'dropbox/data_protection.shared_links.sync.requested',
        data: {
          ...event.data,
          cursor: nextCursor,
        },
      });
      return { status: 'ongoing' };
    }

    await step.sendEvent(`wait-for-shared-links-to-be-fetched`, {
      name: 'dropbox/data_protection.shared_links.sync.completed',
      data: {
        ...event.data,
      },
    });
  }
);
