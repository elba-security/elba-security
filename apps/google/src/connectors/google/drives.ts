import { logger } from '@elba-security/logger';
import { drive_v3 as drive } from '@googleapis/drive';
import { GoogleDriveAccessDenied } from './errors';

export const checkGoogleDriveAdminAccess = async ({
  fields = '*',
  ...aboutParams
}: drive.Params$Resource$About$Get) => {
  try {
    await new drive.Drive({}).about.get({ ...aboutParams, fields });

    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Start of error handling */
  } catch (error: any) {
    const googleDriveAccessErrors = [
      { code: 401, reason: 'authError' },
      { code: 403, reason: 'domainPolicy' },
    ] as const;

    for (const { code, reason } of googleDriveAccessErrors) {
      if (error?.code === code && error?.errors?.[0]?.reason === reason) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- log error
        logger.error('Access to Google Drive has been denied', { error });
        throw new GoogleDriveAccessDenied('Access to Google Drive has been denied', {
          cause: error,
        });
      }
    }
    throw error;
  }
};

export const listGoogleSharedDriveIds = async ({
  useDomainAdminAccess = true,
  fields = ['drives/id', 'nextPageToken'].join(','),
  ...listDrivesParams
}: drive.Params$Resource$Drives$List) => {
  const {
    data: { drives, nextPageToken },
  } = await new drive.Drive({}).drives.list({
    ...listDrivesParams,
    useDomainAdminAccess,
    fields,
  });

  const sharedDriveIds: string[] = [];
  for (const { id } of drives || []) {
    if (id) {
      sharedDriveIds.push(id);
    }
  }

  return { sharedDriveIds, nextPageToken };
};
