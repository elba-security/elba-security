import { startSharedLinksSync } from './start-shared-links-sync';
import { scheduleDataProtectionSync } from './schedule-folders-and-files-sync';
import { syncSharedLinks } from './sync-shared-links';
import { syncFoldersAndFiles } from './sync-folders-and-files';
import { startFolderAndFileSync } from './start-folders-and-files-sync';

export const dataProtectionsFunctions = [
  syncFoldersAndFiles,
  startFolderAndFileSync,
  startSharedLinksSync,
  scheduleDataProtectionSync,
  syncSharedLinks,
];
