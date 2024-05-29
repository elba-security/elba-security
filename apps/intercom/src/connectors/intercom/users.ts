import { z } from 'zod';
import { IntercomError } from '../common/error';

const intercomUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
});

export type IntercomUser = z.infer<typeof intercomUserSchema>;

const intercomResponseSchema = z.object({
  pages: z
    .object({
      page: z.number().nullable(),
      per_page: z.number().nullable(),
      next: z
        .object({
          starting_after: z.string().nullable(),
        })
        .optional(),
    })
    .optional(),
  admins: z.array(z.unknown()),
});

export type GetUsersParams = {
  accessToken: string;
  next?: string | null;
};

export const getUsers = async ({ accessToken, next }: GetUsersParams) => {
  const query = next
    ? new URLSearchParams({
        per_page: '20',
        starting_after: next,
      }).toString()
    : '';

  const endpoint = `${process.env.INTERCOM_API_BASE_URL}/admins?${query}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Intercom-Version': '2.10',
    },
  });

  if (!response.ok) {
    throw new IntercomError('Could not retrieve users', { response });
  }

  const data: unknown = await response.json();
  const { admins, pages } = intercomResponseSchema.parse(data);

  const validUsers: IntercomUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of admins) {
    const result = intercomUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: pages?.next?.starting_after,
  };
};
