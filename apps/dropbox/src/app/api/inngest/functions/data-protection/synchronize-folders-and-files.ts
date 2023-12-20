import { InngestFunctionInputArg, inngest } from '@/common/clients/inngest';
import { getSharedLinks } from './data';
import { handleError } from '../../handle-error';
import { elbaAccess } from '@/common/clients/elba';
import { DBXFetcher } from '@/repositories/dropbox/clients/DBXFetcher';

const handler: Parameters<typeof inngest.createFunction>[2] = async ({
  event,
  step,
}: InngestFunctionInputArg) => {
  if (!event.ts) {
    throw new Error('Missing event.ts');
  }

  const { organisationId, accessToken, teamMemberId, adminTeamMemberId, pathRoot, cursor } =
    event.data;
  try {
    const dbxFetcher = new DBXFetcher({
      accessToken,
      adminTeamMemberId,
      teamMemberId,
      pathRoot,
    });
    const elba = elbaAccess(organisationId);

    const result = await step.run('fetch-folders-and-files', async () => {
      return dbxFetcher.fetchFoldersAndFiles(cursor);
    });

    if (result.hasMore) {
      await step.sendEvent('send-event-synchronize-folders-and-files', {
        name: 'data-protection/synchronize-folders-and-files',
        data: { ...event.data, cursor: result?.nextCursor },
      });
    }

    const pathLowers = result.foldersAndFiles.reduce((acc: string[], file) => {
      if (!file?.path_lower) {
        return acc;
      }

      acc.push(file.path_lower);
      return acc;
    }, []);

    const sharedLinks = await step.run('get-file-shared-links', async () => {
      return getSharedLinks({
        organisationId,
        pathLowers,
      });
    });

    const foldersAndFilesToAdd = await step.run(
      'fetch-metadata-members-and-map-details',
      async () => {
        return dbxFetcher.fetchMetadataMembersAndMapDetails({
          foldersAndFiles: result.foldersAndFiles,
          sharedLinks,
        });
      }
    );

    if (foldersAndFilesToAdd.length > 0) {
      await step.run('send-data-protection-to-elba', async () => {
        // TODO: fix the type issue
        return await elba.dataProtection.updateObjects({
          // @ts-ignore
          objects: foldersAndFilesToAdd,
        });
      });
    }

    return {
      success: true,
    };
  } catch (error) {
    handleError(error);
  }
};

export const synchronizeFoldersAndFiles = inngest.createFunction(
  {
    id: 'synchronize-folders-and-files',
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
      limit: 5,
      key: 'event.data.organisationId',
    },
  },
  { event: 'data-protection/synchronize-folders-and-files' },
  handler
);
