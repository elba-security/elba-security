import { z } from 'zod';
import { SumologicError } from './commons/error';

const sumologicUserSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  isActive: z.boolean(),
  isMfaEnabled: z.boolean(),
});

export type SumologicUser = z.infer<typeof sumologicUserSchema>;

const sumologicResponseSchema = z.object({
  data: z.array(z.unknown()),
  next: z.string().nullable(),
});

export type GetUsersParams = {
  accessId: string;
  accessKey: string;
  sourceRegion: string;
  afterToken?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  accessId: string;
  accessKey: string;
  sourceRegion: string;
};

export const getUsers = async ({ accessId, accessKey, afterToken, sourceRegion }: GetUsersParams) => {
  const encodedKey = Buffer.from(`${accessId}:${accessKey}`).toString('base64');

  const url = new URL(`https://api.${sourceRegion}.sumologic.com/api/v1/users`);
  if (afterToken) {
    url.searchParams.append('token', String(afterToken));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${encodedKey}`,
    },
  });
  if (!response.ok) {
    throw new SumologicError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const { data, next } = sumologicResponseSchema.parse(resData);

  const validUsers: SumologicUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of data) {
    const result = sumologicUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: next ? next : null,
  };
};

export const deleteUsers = async ({ userId, accessId, accessKey, sourceRegion }: DeleteUsersParams) => {
  const url = new URL(`https://api.${sourceRegion}.sumologic.com/api/v1/users/${userId}`);
  const encodedKey = Buffer.from(`${accessId}:${accessKey}`).toString('base64');

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${encodedKey}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new SumologicError('Could not delete user', { response });
  }
};
