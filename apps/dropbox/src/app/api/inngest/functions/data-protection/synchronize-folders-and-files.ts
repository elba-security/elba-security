import { elbaAccess } from '@/common/clients/elba';
import type { FunctionHandler } from '@/common/clients/inngest';
import type { InputArgWithTrigger } from '@/common/clients/types';

import { inngest } from '@/common/clients/inngest';
import { DBXFetcher } from '@/repositories/dropbox/clients/DBXFetcher';
import { handleError } from '../../handle-error';
import { getSharedLinks } from './data';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'data-protection/synchronize-folders-and-files'>) => {
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
        data: { ...event.data, cursor: result.nextCursor },
      });
    }

    const pathLowers = result.foldersAndFiles.reduce((acc: string[], file) => {
      if (!file.path_lower) {
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
          // @ts-expect-error: Should fix this type error
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
    retries: 10,
    concurrency: {
      limit: 5,
      key: 'event.data.organisationId',
    },
  },
  { event: 'data-protection/synchronize-folders-and-files' },
  handler
);
