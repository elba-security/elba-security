import { z } from 'zod';
import { env } from '@/common/env';
import { BrevoError } from '../common/error';

const brevoUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  status: z.string(),
  is_owner: z.boolean(),
});

export type BrevoUser = z.infer<typeof brevoUserSchema>;

const brevoResponseSchema = z.object({
  users: z.array(z.unknown()),
});

export type DeleteUserParams = {
  userId: string;
  apiKey: string;
};

export const getUsers = async (apiKey: string) => {
  const url = new URL(`${env.BREVO_API_BASE_URL}/organization/invited/users`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new BrevoError('API request failed', { response });
  }

  const resData: unknown = await response.json();
  const { users } = brevoResponseSchema.parse(resData);

  const validUsers: BrevoUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of users) {
    const result = brevoUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
  };
};
