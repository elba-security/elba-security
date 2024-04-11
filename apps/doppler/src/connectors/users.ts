import { z } from 'zod';
import { env } from '@/env';
import { getDopplerApiClient } from '@/common/apiclient';

const dopplerUserSchema = z.object({
  id: z.string(),
  access: z.string(),
  user: z.object({
    email: z.string(),
    name: z.string(),
  }),
});

export type DopplerUser = z.infer<typeof dopplerUserSchema>;

const dopplerResponseSchema = z.object({
  workplace_users: z.array(z.unknown()),
  page: z.number(),
});

export type GetUsersParams = {
  apiKey: string;
  afterToken?: string | null;
};

export const getUsers = async ({ apiKey, afterToken }: GetUsersParams) => {
  const endpoint = new URL(`${env.DOPPLER_API_BASE_URL}workplace/users`);

  if (afterToken) {
    endpoint.searchParams.append('page', String(afterToken));
  }

  const dopplerApiClient = getDopplerApiClient();

  const resData: unknown = await dopplerApiClient.get(endpoint.toString(), apiKey);

  const { workplace_users: users, page } = dopplerResponseSchema.parse(resData);

  const validUsers: DopplerUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of users) {
    const result = dopplerUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: users.length > 0 ? (page + 1).toString() : null,
  };
};

