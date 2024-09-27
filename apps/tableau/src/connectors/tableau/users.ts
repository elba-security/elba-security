import { z } from 'zod';
import { env } from '@/common/env';
import { TableauError } from '../commons/error';

const tableauUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  siteRole: z.string(),
});

export type TableauUser = z.infer<typeof tableauUserSchema>;

export type TableauPaginatedResponse<T> = {
  error?: {
    code?: string;
  };
  pagination: {
    pageNumber: string;
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
  const usersUrl = new URL(`https://${domain}/api/3.22/sites/${siteId}/users`);

  usersUrl.searchParams.append('pageSize', env.TABLEAU_USERS_SYNC_BATCH_SIZE.toString());

  if (page) {
    usersUrl.searchParams.append('pageNumber', page);
  }

  const response = await fetch(usersUrl, {
    headers: {
      'X-Tableau-Auth': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  let responseData: TableauPaginatedResponse<unknown>;
  try {
    responseData = (await response.json()) as TableauPaginatedResponse<unknown>;
    if (!response.ok) {
      // Tableau sucks. Tableau will return this error response when the given page number is greater than the total number of pages available
      if (responseData.error?.code === '400006') {
        return { validUsers: [] as TableauUser[], invalidUsers: [] as unknown[], nextPage: null };
      }

      throw new TableauError('Could not retrieve users', { response });
    }
  } catch (error) {
    if (error instanceof TableauError) {
      throw error;
    }

    throw new TableauError('Failed to parse response while retrieving users', { response });
  }

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
    nextPage: String(Number(responseData.pagination.pageNumber) + 1),
  };
};
