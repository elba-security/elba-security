import { drive_v3 as drive } from '@googleapis/drive';

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
