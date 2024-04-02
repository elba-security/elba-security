import type { infer as zInfer } from 'zod';
import { z } from 'zod';
import { drive_v3 as drive } from '@googleapis/drive';

export const googleFileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sha256Checksum: z.string().min(1).optional(),
  viewedByMeTime: z.string().min(1).optional(),
});

export type GoogleFile = zInfer<typeof googleFileSchema>;

const googleFileFields = ['id', 'name', 'sha256Checksum', 'viewedByMeTime'];

export const getGoogleFile = async ({
  fields = googleFileFields.join(','),
  supportsAllDrives = true,
  ...getFileParams
}: drive.Params$Resource$Files$Get) => {
  const { data: googleFile } = await new drive.Drive({}).files.get({
    ...getFileParams,
    fields,
    supportsAllDrives,
  });

  const result = googleFileSchema.safeParse(googleFile);
  if (!result.success) {
    throw new Error('Failed to parse Google file');
  }

  return result.data;
};

export const listGoogleFiles = async ({
  fields = [...googleFileFields.map((field) => `files/${field}`), 'nextPageToken'].join(','),
  ...listFilesParams
}: drive.Params$Resource$Files$List) => {
  const {
    data: { files: googleFiles, nextPageToken },
  } = await new drive.Drive({}).files.list({
    ...listFilesParams,
    fields,
  });

  const files: GoogleFile[] = [];
  for (const file of googleFiles || []) {
    const result = googleFileSchema.safeParse(file);
    if (result.success) {
      files.push(result.data);
    }
  }

  return { files, nextPageToken };
};
