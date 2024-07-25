import { z } from 'zod';
import { env } from '@/common/env';
import { OpenAiError } from '../common/error';

const openAiUserSchema = z.object({
  role: z.string(),
  is_service_account: z.literal(false),
  user: z.object({
    object: z.literal('user'),
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
  members: z.object({ data: z.array(z.unknown()) }),
});

type GetUsersParams = {
  apiKey: string;
  organizationId: string;
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

export const getUsers = async ({ apiKey, organizationId }: GetUsersParams) => {
  const response = await fetch(`${env.OPENAI_API_BASE_URL}/organizations/${organizationId}/users`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new OpenAiError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { members } = getUsersResponseDataSchema.parse(resData);

  const validUsers: OpenAiUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const member of members.data) {
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
  };
};

type DeleteUserParams = {
  apiKey: string;
  organizationId: string;
  userId: string;
};

export const deleteUser = async ({ apiKey, organizationId, userId }: DeleteUserParams) => {
  const response = await fetch(
    `${env.OPENAI_API_BASE_URL}/organizations/${organizationId}/users/${userId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new OpenAiError(`Could not delete user with Id: ${userId}`, { response });
  }
};
