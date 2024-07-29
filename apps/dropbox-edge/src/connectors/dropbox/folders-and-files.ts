import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { DropboxError } from '../common/error';

type GetFolderAndFiles = {
  accessToken: string;
  teamMemberId: string;
  pathRoot: string;
  cursor: string | null;
  isAdmin: boolean;
};

export const fileSchema = z.object({
  '.tag': z.literal('file'),
  id: z.string(),
  name: z.string(),
  path_display: z.string().optional(),
  path_lower: z.string().optional(),
  server_modified: z.string(),
  content_hash: z.string().optional(),
});

export type File = z.infer<typeof fileSchema>;

export const folderSchema = z.object({
  '.tag': z.literal('folder'),
  id: z.string(),
  name: z.string(),
  path_display: z.string().optional(),
  path_lower: z.string().optional(),
  shared_folder_id: z.string(),
  sharing_info: z
    .object({
      shared_folder_id: z.string(),
    })
    .optional(),
});

export type Folder = z.infer<typeof folderSchema>;

export type FolderAndFile = File | Folder;

export const foldersAndFilesResponseSchema = z.object({
  entries: z.array(z.unknown()),
  cursor: z.string().optional(),
  has_more: z.boolean(),
});

export const getFoldersAndFiles = async ({
  accessToken,
  teamMemberId,
  pathRoot,
  cursor,
  isAdmin,
}: GetFolderAndFiles) => {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'Dropbox-API-Select-User': teamMemberId,
    ...(isAdmin && {
      'Dropbox-API-Path-Root': `{".tag": "root", "root": "${pathRoot}"}`,
    }),
  };

  if (cursor) {
    logger.info(`Fetching folders and files with cursor: ${cursor}`);
  }

  const response = await fetch(
    `${env.DROPBOX_API_BASE_URL}/2/files/list_folder${cursor ? '/continue' : ''}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(
        cursor
          ? { cursor }
          : {
              path: '',
              include_deleted: false,
              include_has_explicit_shared_members: true,
              include_media_info: true,
              include_mounted_folders: true,
              include_non_downloadable_files: true,
              recursive: true,
              limit: env.DROPBOX_LIST_FOLDER_BATCH_SIZE || 300,
            }
      ),
    }
  );

  if (!response.ok) {
    throw await DropboxError.fromResponse('Could not retrieve files & folders', { response });
  }

  const data: unknown = await response.json();

  const result = foldersAndFilesResponseSchema.safeParse(data);

  if (!result.success) {
    throw new Error('Could not retrieve files & folders', {
      cause: result.error,
    });
  }

  const { entries, cursor: nextCursor, has_more: hasMore } = result.data;

  return {
    foldersAndFiles: entries as FolderAndFile[],
    nextCursor: hasMore ? nextCursor : null,
  };
};
