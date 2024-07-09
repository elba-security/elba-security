import { z } from 'zod';
import { env } from '@/common/env';
import { TableauError } from './commons/error';

const tableauUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  siteRole: z.string(),
});

export type TableauUser = z.infer<typeof tableauUserSchema>;

export type TableauPaginatedResponse<T> = {
  pagination: {
    pageNumber: string;
    pageSize: string;
    totalAvailable: string;
  };
  users: {
    user?: T[];
  };
};

type GetUsersParams = {
  token: string;
  domain: string;
  siteId: string;
  page?: string | null;
};

export const getUsers = async ({ token, domain, siteId, page }: GetUsersParams) => {
  const usersUrl = new URL(`${domain}/api/3.22/sites/${siteId}/users`);

  usersUrl.searchParams.append('pageSize', env.TABLEAU_USERS_SYNC_BATCH_SIZE.toString());

  if (page) {
    usersUrl.searchParams.append('pageNumber', page.toString());
  }

  const response = await fetch(usersUrl, {
    headers: {
      'X-Tableau-Auth': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new TableauError('Could not retrieve users', { response });
  }

  const responseData = (await response.json()) as TableauPaginatedResponse<unknown>;

  const validUsers: TableauUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of responseData.users.user || []) {
    const userResult = tableauUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage:
      Number(responseData.pagination.totalAvailable) < Number(env.TABLEAU_USERS_SYNC_BATCH_SIZE)
        ? null
        : String(Number(responseData.pagination.pageNumber) + 1),
  };
};
