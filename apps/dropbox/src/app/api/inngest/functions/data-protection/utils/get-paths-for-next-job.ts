import { FileAndFolderType } from '../types';

export const getPathsForNextSyncJobs = ({
  entries,
  rootNamespaceId,
}: {
  entries: FileAndFolderType[];
  rootNamespaceId: string;
}): string[] => {
  return entries.reduce((acc: string[], entry: FileAndFolderType) => {
    if (entry['.tag'] !== 'folder' || !entry?.path_lower) {
      return acc;
    }

    if (
      entry['.tag'] === 'folder' &&
      entry?.parent_shared_folder_id === rootNamespaceId &&
      !entry?.shared_folder_id
    ) {
      return acc;
    }

    acc.push(entry.path_lower);

    return acc;
  }, []);
};
