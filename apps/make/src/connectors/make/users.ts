import { z } from 'zod';
import { env } from '@/common/env';
import { MakeError } from '../common/error';

const makeUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

export type MakeUser = z.infer<typeof makeUserSchema>;

const makeResponseSchema = z.object({
  users: z.array(z.unknown()),
  pg: z.object({
    limit: z.number(),
    offset: z.number(),
  }),
});

export type GetUsersParams = {
  apiToken: string;
  zoneDomain: string;
  selectedOrganizationId: string;
  page?: string | null;
};

export const getUsers = async ({
  apiToken,
  zoneDomain,
  selectedOrganizationId,
  page,
}: GetUsersParams) => {
  const url = new URL(`https://${zoneDomain}/api/v2/users`);
  url.searchParams.append('organizationId', String(selectedOrganizationId));
  url.searchParams.append('pg[limit]', String(env.MAKE_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('pg[offset]', String(page));
  }
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Token ${apiToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new MakeError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const { users, pg } = makeResponseSchema.parse(resData);

  const validUsers: MakeUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of users) {
    const result = makeUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: users.length === env.MAKE_USERS_SYNC_BATCH_SIZE ? pg.offset + pg.limit : null,
  };
};
