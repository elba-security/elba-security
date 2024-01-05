import type { FunctionHandler } from '@/common/clients/inngest';
import { inngest } from '@/common/clients/inngest';
import { DBXFetcher } from '@/repositories/dropbox/clients/DBXFetcher';
import { handleError } from '../../handle-error';
import { insertSharedLinks } from './data';
import { InputArgWithTrigger } from '@/common/clients/types';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'data-protection/synchronize-shared-links'>) => {
  const { organisationId, accessToken, cursor, pathRoot, teamMemberId, isPersonal } = event.data;

  const sharedLinks = await step
    .run('fetch-shared-links', async () => {
      const dbxFetcher = new DBXFetcher({
        accessToken,
        teamMemberId,
        pathRoot,
      });

      const {
        cursor: nextCursor,
        hasMore,
        links,
      } = await dbxFetcher.fetchSharedLinks({
        isPersonal,
        cursor,
      });

      return {
        hasMore,
        links,
        nextCursor,
      };
    })
    .catch(handleError);

  if (!sharedLinks) {
    throw new Error(`SharedLinks is undefined for the organisation ${organisationId}`);
  }

  if (sharedLinks.links.length > 0) {
    await step.run('insert-shared-links', async () => {
      await insertSharedLinks(
        sharedLinks.links.map((link) => ({ ...link, organisationId, teamMemberId }))
      );
    });
  }

  if (sharedLinks?.hasMore) {
    await step.sendEvent('send-event-synchronize-shared-links', {
      name: 'data-protection/synchronize-shared-links',
      data: {
        ...event.data,
        cursor: sharedLinks.nextCursor,
      },
    });

    return {
      success: true,
    };
  }
  await step.sendEvent(`wait-for-shared-links-to-be-fetched`, {
    name: 'shared-links/synchronize.shared-links.completed',
    data: {
      ...event.data,
      cursor: sharedLinks.nextCursor,
    },
  });

  return {
    success: true,
  };
};

export const synchronizeSharedLinks = inngest.createFunction(
  {
    id: 'synchronize-shared-links',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 10,
      key: 'event.data.organisationId',
    },
  },
  { event: 'data-protection/synchronize-shared-links' },
  handler
);
