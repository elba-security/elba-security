import type { infer as zInfer } from 'zod';
import { z } from 'zod';
import { admin_directory_v1 as adminDirectory } from '@googleapis/admin';
import { logger } from '@elba-security/logger';

export const googleUserSchema = z.object({
  id: z.string().min(1),
  primaryEmail: z.string().email(),
  name: z
    .object({
      fullName: z.string().min(1).optional(),
    })
    .optional(),
  emails: z
    .array(
      z.object({
        address: z.string().email(),
      })
    )
    .optional(),
  isEnrolledIn2Sv: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  customerId: z.string().min(1).optional(),
});

export type GoogleUser = zInfer<typeof googleUserSchema>;

const googleBaseUserFields = ['id', 'primaryEmail'];

const googleUserFields = [
  ...googleBaseUserFields,
  'emails.address',
  'isEnrolledIn2Sv',
  'name.fullName',
];

export const getGoogleUser = async ({
  fields = [...googleUserFields, 'isAdmin', 'customerId'].join(','),
  ...getUserParams
}: adminDirectory.Params$Resource$Users$Get) => {
  const { data: user } = await new adminDirectory.Admin({}).users.get({
    ...getUserParams,
    fields,
  });

  const result = googleUserSchema.safeParse(user);
  if (!result.success) {
    logger.error('Failed to parse Google user', { user });
    throw new Error('Failed to parse Google user');
  }

  return result.data;
};

const listUsers = async <T>(
  {
    showDeleted = 'false',
    query = 'isSuspended=false isArchived=false',
    ...listUsersParams
  }: adminDirectory.Params$Resource$Users$List,
  schema: z.Schema<T>
) => {
  const {
    data: { users: googleUsers, nextPageToken },
  } = await new adminDirectory.Admin({}).users.list({
    ...listUsersParams,
    showDeleted,
    query,
  });

  const users: T[] = [];
  for (const user of googleUsers || []) {
    const result = schema.safeParse(user);
    if (result.success) {
      users.push(result.data);
    }
  }

  return { users, nextPageToken };
};

export const listGoogleUsers = async ({
  fields = [...googleUserFields.map((field) => `users/${field}`), 'nextPageToken'].join(','),
  ...listUsersParams
}: adminDirectory.Params$Resource$Users$List) => {
  return listUsers(
    {
      ...listUsersParams,
      fields,
    },
    googleUserSchema
  );
};
