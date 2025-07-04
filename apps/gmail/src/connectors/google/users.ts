import type { infer as zInfer } from 'zod';
import { z } from 'zod';
import { admin_directory_v1 as adminDirectory } from '@googleapis/admin';
import { logger } from '@elba-security/logger';
import { GoogleUserNotAdminError } from './errors';

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
        address: z.string(),
      })
    )
    // As the additional emails could have invalid format like `*@domain.local`
    // We use zod transform to filter out invalid emails and avoid user parsing failure
    .transform((emails) =>
      emails.filter((email) => z.string().email().safeParse(email.address).success)
    )
    .optional(),
  isEnrolledIn2Sv: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  customerId: z.string().min(1).optional(),
});

export type GoogleUser = zInfer<typeof googleUserSchema>;

export const googleBaseUserFields = ['id', 'primaryEmail'];

const googleUserFields = [
  ...googleBaseUserFields,
  'emails.address',
  'isEnrolledIn2Sv',
  'name.fullName',
];

export const checkUserIsAdmin = async ({
  userId,
  auth,
}: {
  userId: string;
  auth: adminDirectory.Params$Resource$Users$Get['auth'];
}) => {
  try {
    const { data: user } = await new adminDirectory.Admin({}).users.get({
      fields: 'isAdmin',
      userKey: userId,
      auth,
    });

    if (!user.isAdmin) {
      throw new GoogleUserNotAdminError('User is not admin');
    }
  } catch (error) {
    logger.error('User is not admin', { userId, error });
    throw new GoogleUserNotAdminError('User is not admin', { cause: error });
  }
};

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
