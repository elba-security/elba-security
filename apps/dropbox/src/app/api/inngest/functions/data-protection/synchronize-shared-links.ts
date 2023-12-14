import { FunctionHandler, inngest } from '@/common/clients/inngest';
import { DBXAccess } from '@/repositories/dropbox/clients';
import { filterSharedLinks } from './utils/filter-shared-links';
import { insertSharedLinks } from './data';
import { handleError } from '../../handle-error';

const handler: FunctionHandler = async ({ event, step }) => {
  const { organisationId, accessToken, isPersonal, pagination, teamMemberId, pathRoot } =
    event.data;

  if (!event.ts) {
    throw new Error('Missing event.ts');
  }

  const sharedLinks = await step
    .run('fetch-shared-links', async () => {
      const dbxAccess = new DBXAccess({
        accessToken,
      });

      dbxAccess.setHeaders({
        selectUser: teamMemberId,
        ...(isPersonal ? {} : { pathRoot: JSON.stringify({ '.tag': 'root', root: pathRoot }) }),
      });

      const response = await dbxAccess.sharingListSharedLinks({
        cursor: pagination,
      });

      const {
        result: { links, has_more: hasMore, cursor },
      } = response;

      return {
        hasMore,
        links,
        cursor,
      };
    })
    .catch(handleError);

  // await step.run('inngest-console-log-synchronize-shared-links', async () => {
  //   console.log('----------synchronize-shared-links-------------');
  //   console.log(teamMemberId);
  //   console.log('sharedLinks', sharedLinks.links.length);
  //   console.log('hasMore', sharedLinks?.hasMore);
  //   console.log('------------------------------------------------');
  // });

  if (sharedLinks.links.length > 0) {
    await step.run('insert-shared-links', async () => {
      const formattedShredLinks = filterSharedLinks({
        sharedLinks: sharedLinks.links,
        organisationId,
        teamMemberId,
      });
      await insertSharedLinks(formattedShredLinks);
    });
  }

  if (sharedLinks?.hasMore) {
    await step.sendEvent('send-event-synchronize-shared-links', {
      name: 'data-protection/synchronize-shared-links',
      data: {
        ...event.data,
        pagination: sharedLinks.cursor,
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
