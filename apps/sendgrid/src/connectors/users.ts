import { env } from '@/env';
import { SendgridError } from './commons/error';

export type SendGridUser = {
  username: string;
  email: string;
  is_sso: boolean;
  user_type: string;
};

export type Pagination = {
  next: number | null;
};

type GetUsersResponseData = { result: SendGridUser[] };

export const getUsers = async (token: string, offset: number) => {
  const response = await fetch(
    `https://api.sendgrid.com/v3/teammates?limit=${env.USERS_SYNC_BATCH_SIZE}&offset=${offset}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    throw new SendgridError('Could not retrieve users', { response });
  }
  const data = (await response.json()) as GetUsersResponseData;
  const users = data.result.map((user: SendGridUser) => ({
    username: user.username,
    email: user.email,
    is_sso: user.is_sso,
    user_type: user.user_type,
  }));
  const pagination: Pagination = {
    next: users.length === env.USERS_SYNC_BATCH_SIZE ? offset + env.USERS_SYNC_BATCH_SIZE : null,
  };
  return { users, pagination };
};
