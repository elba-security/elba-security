import { z } from 'zod';
import { env } from '@/common/env';
import { DropboxError } from '../common/error';
import { type FilteredSharedLink } from '../elba/data-protection/shared-link';
import { formatPermissions } from '../elba/data-protection/permissions';
import { formatFilesToAdd } from '../elba/data-protection/files';
import { type File } from './folders-and-files';
import { chunkArray } from './utils';

// Fetch file permissions
const userRoleSchema = z.union([
  z.literal('owner'),
  z.literal('editor'),
  z.literal('viewer'),
  z.literal('viewer_no_comment'),
  z.literal('traverse'),
  z.literal('other'),
]);

export type UserRole = z.infer<typeof userRoleSchema>;

export const fileFolderPermissionsSchema = z.object({
  groups: z.array(
    z.object({
      access_type: z.object({ '.tag': userRoleSchema }),
      group: z.object({
        group_id: z.string(),
        group_management_type: z.object({ '.tag': z.string() }),
        group_name: z.string(),
        group_type: z.object({ '.tag': z.string() }),
        is_member: z.boolean(),
        is_owner: z.boolean(),
      }),
      is_inherited: z.boolean(),
    })
  ),
  invitees: z.array(
    z.object({
      access_type: z.object({ '.tag': userRoleSchema }),
      invitee: z.object({ '.tag': z.string(), email: z.string() }),
      user: z
        .object({
          account_id: z.string(),
          display_name: z.string(),
          email: z.string(),
          team_member_id: z.string().optional(),
        })
        .optional(),
      is_inherited: z.boolean(),
    })
  ),
  users: z.array(
    z.object({
      access_type: z.object({ '.tag': userRoleSchema }),
      is_inherited: z.boolean(),
      user: z.object({
        account_id: z.string(),
        display_name: z.string(),
        email: z.string(),
        team_member_id: z.string().optional(),
      }),
    })
  ),
  // Custom permission
  anyone: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
        linkAccessLevel: z.string(),
        pathLower: z.string(),
      })
    )
    .optional(),
  cursor: z.string().optional(),
});

export type GeneralFolderFilePermissions = z.infer<typeof fileFolderPermissionsSchema>;

export type FolderFilePermissions = Map<string, GeneralFolderFilePermissions>;

export const getFilesPermissions = async ({
  accessToken,
  teamMemberId,
  files,
}: {
  accessToken: string;
  teamMemberId: string;
  files: File[];
}) => {
  const permissions: FolderFilePermissions = new Map();
  const concurrentLimit = 20;

  const throttledFetch = async (fileBatch: File[]) => {
    await Promise.all(
      fileBatch.map(async ({ id: fileId }) => {
        const filePermissions: GeneralFolderFilePermissions = {
          users: [],
          groups: [],
          invitees: [],
        };
        let nextCursor: string | undefined;
        do {
          const response = await fetch(
            `${env.DROPBOX_API_BASE_URL}/2/sharing/list_file_members${
              nextCursor ? '/continue' : ''
            }`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                'Dropbox-API-Select-User': teamMemberId,
              },
              body: JSON.stringify(
                nextCursor
                  ? { cursor: nextCursor }
                  : {
                      file: fileId,
                      include_inherited: true,
                      limit: env.DROPBOX_LIST_FILE_MEMBERS_LIMIT,
                    }
              ),
            }
          );

          if (!response.ok) {
            throw await DropboxError.fromResponse('Could not retrieve shared links', { response });
          }

          const data: unknown = await response.json();

          const { users, groups, invitees, cursor } = fileFolderPermissionsSchema.parse(data);

          filePermissions.users.push(...users);
          filePermissions.groups.push(...groups);
          filePermissions.invitees.push(...invitees);
          nextCursor = cursor;
        } while (nextCursor);

        permissions.set(fileId, filePermissions);
      })
    );
  };

  // Split files array into batches and process each batch sequentially
  for (let i = 0; i < files.length; i += concurrentLimit) {
    const fileBatch = files.slice(i, i + concurrentLimit);

    await throttledFetch(fileBatch);
  }

  return permissions;
};

// Fetch file metadata
const fileMetadataSchema = z.object({
  '.tag': z.string(),
  id: z.string(),
  name: z.string(),
  preview_url: z.string(),
});

const filesMetadataResponseSchema = z.array(
  z.object({
    file: z.string(),
    result: fileMetadataSchema,
  })
);

export type FileMetadata = z.infer<typeof fileMetadataSchema>;

const getFilesMetadataBatch = async ({
  accessToken,
  teamMemberId,
  files,
}: {
  accessToken: string;
  teamMemberId: string;
  files: File[];
}) => {
  const sharedFileMetadata = new Map<
    string,
    {
      name: string;
      preview_url: string;
    }
  >();

  const fileIds = files.map((file) => file.id);
  const fileChunks = chunkArray(fileIds, 80);

  await Promise.all(
    fileChunks.map(async (fileChunk) => {
      const response = await fetch(
        `${env.DROPBOX_API_BASE_URL}/2/sharing/get_file_metadata/batch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'Dropbox-API-Select-User': teamMemberId,
          },
          body: JSON.stringify({
            files: fileChunk,
            actions: [],
          }),
        }
      );

      if (!response.ok) {
        throw await DropboxError.fromResponse('Could not retrieve shared links', { response });
      }

      const data: unknown = await response.json();

      const result = filesMetadataResponseSchema.parse(data);

      result.forEach(({ file, result: fileDetails }) => {
        if (fileDetails['.tag'] === 'access_error' || fileDetails['.tag'] === 'other') {
          return;
        }

        sharedFileMetadata.set(file, {
          name: fileDetails.name,
          preview_url: fileDetails.preview_url,
        });
      });
    })
  );

  return sharedFileMetadata;
};

export const getFilesMetadataMembersAndMapDetails = async ({
  accessToken,
  teamMemberId,
  files,
  sharedLinks,
}: {
  accessToken: string;
  teamMemberId: string;
  files: File[];
  sharedLinks: FilteredSharedLink[];
}) => {
  const [filesPermissions, filesMetadata] = await Promise.all([
    getFilesPermissions({
      accessToken,
      teamMemberId,
      files,
    }),
    getFilesMetadataBatch({
      accessToken,
      teamMemberId,
      files,
    }),
  ]);

  const mappedResult = files.map((entry) => {
    const permissions = filesPermissions.get(entry.id);
    const metadata = filesMetadata.get(entry.id);

    if (sharedLinks.length > 0 && permissions) {
      permissions.anyone = sharedLinks.filter(({ id }) => id === entry.id);
    }

    if (metadata && permissions) {
      const formattedPermissions = formatPermissions(permissions);
      return {
        ...entry,
        metadata,
        permissions: formattedPermissions,
      };
    }

    // Permissions and metadata should have been assigned, if not throw error
    throw new Error('Permissions or metadata not found');
  });

  if (!teamMemberId) {
    throw new Error('Missing teamMemberId');
  }

  return formatFilesToAdd({
    teamMemberId,
    files: mappedResult,
  });
};

export type GetFilesMetadataMembersAndMapDetails = Awaited<
  ReturnType<typeof getFilesMetadataMembersAndMapDetails>
>;
