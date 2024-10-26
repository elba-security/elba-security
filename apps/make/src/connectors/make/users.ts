import { z } from 'zod';
import { env } from '@/common/env';
import { MakeError } from '../common/error';

const MakeUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const PaginationSchema = z.object({
  limit: z.number(),
  offset: z.number(),
});

const getUsersResponseDataSchema = z.object({
  users: z.array(MakeUserSchema),
  pg: PaginationSchema,
});

export type MakeUser = z.infer<typeof MakeUserSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;

export const getUsers = async (
  token: string,
  organizationId: string,
  page: number | null,
  zoneDomain: string
) => {
  const url = new URL(`https://${zoneDomain}/api/v2/users`);
  url.searchParams.append('organizationId', String(organizationId));
  url.searchParams.append('pg[limit]', String(env.MAKE_USERS_SYNC_BATCH_SIZE));

  if (page !== null) {
    url.searchParams.append('pg[offset]', String(page));
  }

  const response = await fetch(url, {
    headers: { Authorization: `Token ${token}` },
  });

  if (!response.ok) {
    throw new MakeError('Could not retrieve users', { response });
  }
  const resData: unknown = await response.json();
  const { users, pg } = getUsersResponseDataSchema.parse(resData);

  const validUsers: MakeUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const userValidation = MakeUserSchema.safeParse(user);
    if (userValidation.success) {
      validUsers.push(userValidation.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: users.length === env.MAKE_USERS_SYNC_BATCH_SIZE ? pg.offset + pg.limit : null,
  };
};
