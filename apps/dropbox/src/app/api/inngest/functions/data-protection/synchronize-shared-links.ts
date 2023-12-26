import { FunctionHandler, InngestFunctionInputArg, inngest } from '@/common/clients/inngest';
import { InsertSharedLinks, insertSharedLinks } from './data';
import { handleError } from '../../handle-error';
import { DBXFetcher } from '@/repositories/dropbox/clients/DBXFetcher';

const handler: FunctionHandler = async ({ event, step }: InngestFunctionInputArg) => {
  const { organisationId, accessToken, isPersonal, cursor, teamMemberId, pathRoot } = event.data;

  if (!event.ts) {
    throw new Error('Missing event.ts');
  }

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
        organisationId,
        teamMemberId,
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

  if (!sharedLinks?.links) {
    throw new Error('Missing sharedLinks.links');
  }

  if (sharedLinks.links.length > 0) {
    await step.run('insert-shared-links', async () => {
      await insertSharedLinks(sharedLinks.links as InsertSharedLinks[]);
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
  } else {
    await step.sendEvent(`wait-for-shared-links-to-be-fetched`, {
      name: 'shared-links/synchronize.shared-links.completed',
      data: {
        organisationId,
        teamMemberId,
        isPersonal,
      },
    });
  }

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
    // rateLimit: {
    //   limit: 1,
    //   key: 'event.data.organisationId',
    //   period: '1s',
    // },
    retries: 10,
    concurrency: {
      limit: 10,
      key: 'event.data.organisationId',
    },
  },
  { event: 'data-protection/synchronize-shared-links' },
  handler
);
