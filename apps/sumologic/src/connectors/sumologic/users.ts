import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { SumologicError } from '../common/error';

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

const ownerIdResponseSchema = z.string();
export type GetUsersParams = {
  accessId: string;
  accessKey: string;
  sourceRegion: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  accessId: string;
  accessKey: string;
  sourceRegion: string;
};

export type GetOwnerIdParams = {
  accessId: string;
  accessKey: string;
  sourceRegion: string;
};
export const getUsers = async ({ accessId, accessKey, sourceRegion, page }: GetUsersParams) => {
  const encodedKey = Buffer.from(`${accessId}:${accessKey}`).toString('base64');

  const url = new URL(`https://api.${sourceRegion}.sumologic.com/api/v1/users`);
  url.searchParams.append('limit', String(env.SUMOLOGIC_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('token', page);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${encodedKey}`,
    },
  });
  if (!response.ok) {
    throw new SumologicError('Could not retrieve Sumologic users', { response });
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

export const deleteUser = async ({
  accessId,
  accessKey,
  sourceRegion,
  userId,
}: DeleteUsersParams) => {
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
    throw new SumologicError(`Could not delete user with Id: ${userId}`, { response });
  }
};

export const getOwnerId = async ({ accessId, accessKey, sourceRegion }: GetOwnerIdParams) => {
  const encodedKey = Buffer.from(`${accessId}:${accessKey}`).toString('base64');

  const url = new URL(`https://api.${sourceRegion}.sumologic.com/api/v1/account/accountOwner`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${encodedKey}`,
    },
  });
  if (!response.ok) {
    throw new SumologicError('Could not retrieve owner id', { response });
  }

  const resData: unknown = await response.json();

  const result = ownerIdResponseSchema.safeParse(resData);
  if (!result.success) {
    logger.error('Invalid Sumologic owner id response', { resData });
    throw new SumologicError('Invalid Sumologic owner id response');
  }

  return {
    ownerId: result.data,
  };
};
