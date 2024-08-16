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
  has_explicit_shared_members: z.boolean().optional(),
});

export type File = z.infer<typeof fileSchema>;

export const folderSchema = z.object({
  '.tag': z.literal('folder'),
  id: z.string(),
  name: z.string(),
  path_display: z.string().optional(),
  path_lower: z.string().optional(),
  shared_folder_id: z.string().optional(),
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

const pathNotFoundSchema = z.object({
  error_summary: z.string(),
  error: z.object({
    '.tag': z.literal('path'),
    path: z.object({
      '.tag': z.literal('not_found'),
    }),
  }),
});

type PathNotFound = z.infer<typeof pathNotFoundSchema>;

export const getFolderOrFileMetadataByPath = async ({
  accessToken,
  teamMemberId,
  path,
  pathRoot,
  isAdmin,
}: {
  accessToken: string;
  teamMemberId: string;
  path: string;
  pathRoot: string;
  isAdmin: boolean;
}): Promise<FolderAndFile | PathNotFound> => {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'Dropbox-API-Select-User': teamMemberId,
    ...(isAdmin && {
      'Dropbox-API-Path-Root': `{".tag": "root", "root": "${pathRoot}"}`,
    }),
  };

  const response = await fetch(`${env.DROPBOX_API_BASE_URL}/2/files/get_metadata`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      path,
      include_deleted: false,
      include_has_explicit_shared_members: true,
      include_media_info: true,
    }),
  });

  if (!response.ok) {
    if (response.status === 409) {
      const data = await response.text();
      logger.info(`Path not found: ${data}`);
      const result = pathNotFoundSchema.safeParse(JSON.parse(data));

      if (result.success) {
        return result.data;
      }
    }

    throw await DropboxError.fromResponse('Could not retrieve folder or file metadata', {
      response,
    });
  }

  const data: unknown = await response.json();

  const result = z.union([fileSchema, folderSchema]).safeParse(data);

  if (!result.success) {
    throw new Error('Could not retrieve folder or file metadata', {
      cause: result.error,
    });
  }

  return result.data;
};
