import { z } from 'zod';
import { env } from '@/common/env';
import { OpenAiError } from '../common/error';

const openAiUserSchema = z.object({
  user: z.object({
    object: z.literal('organization.user'),
    role: z.string(),
    id: z.string().min(1),
    name: z.string(),
    email: z.string(),
  }),
});

const openAiMeSchema = z.object({
  id: z.string(),
  orgs: z.object({
    data: z.array(
      z.object({
        personal: z.boolean(),
        id: z.string(),
        role: z.enum(['owner', 'reader']),
      })
    ),
  }),
});

export type OpenAiUser = z.infer<typeof openAiUserSchema>;

const getUsersResponseDataSchema = z.object({
  data: z.array(z.unknown()),
  last_id: z.string(),
  has_more: z.boolean(),
});

type GetUsersParams = {
  apiKey: string;
  page?: string | null;
};

export const getTokenOwnerInfo = async (apiKey: string) => {
  const response = await fetch(`${env.OPENAI_API_BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new OpenAiError('Could not retrieve token owner information', { response });
  }

  const data: unknown = await response.json();

  const {
    id,
    orgs: {
      data: [organization],
    },
  } = openAiMeSchema.parse(data);

  return { userId: id, organization };
};

export const getUsers = async ({ apiKey, page }: GetUsersParams) => {
  const url = new URL(`${env.OPENAI_API_BASE_URL}/organizations/users`);

  url.searchParams.append('limit', `${env.OPENAI_USERS_SYNC_BATCH_SIZE}`);

  if (page) {
    url.searchParams.append('after', page);
  }

  const response = await fetch(`${env.OPENAI_API_BASE_URL}/organizations/users`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new OpenAiError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const resultData = getUsersResponseDataSchema.parse(resData);

  const validUsers: OpenAiUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const member of resultData.data) {
    const result = openAiUserSchema.safeParse(member);

    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(member);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: resultData.has_more ? resultData.last_id : null,
  };
};

type DeleteUserParams = {
  apiKey: string;
  userId: string;
};

export const deleteUser = async ({ apiKey, userId }: DeleteUserParams) => {
  const response = await fetch(`${env.OPENAI_API_BASE_URL}/organizations/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok && response.status !== 404) {
    throw new OpenAiError(`Could not delete user with Id: ${userId}`, { response });
  }
};
