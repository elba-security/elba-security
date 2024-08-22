import { decrypt } from '@/common/crypto';
import { getSharedLinks } from '@/connectors/dropbox/shared-links';
import { getOrganisation } from '@/database/organisations';
import { insertSharedLinks } from '@/database/shared-links';
import { inngest } from '@/inngest/client';

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
    const { organisationId, cursor, teamMemberId, isPersonal, pathRoot } = event.data;

    const { accessToken } = await getOrganisation(organisationId);

    const decryptedAccessToken = await decrypt(accessToken);

    const { links: sharedLinks, nextCursor } = await step.run('fetch-shared-links', async () => {
      return await getSharedLinks({
        accessToken: decryptedAccessToken,
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
