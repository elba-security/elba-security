import { z } from 'zod';
import { env } from '@/common/env';
import { BamboohrError } from '../common/error';

const bamboohrUserSchema = z.object({
  employeeId: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  status: z.string(),
});

export type BamboohrUser = z.infer<typeof bamboohrUserSchema>;

const bamboohrResponseSchema = z.array(z.unknown());

export type GetUsersParams = {
  userName: string;
  password: string;
  subDomain: string;
};

export const getUsers = async ({ userName, password, subDomain }: GetUsersParams) => {
  const url = new URL(`${env.BAMBOOHR_API_BASE_URL}/api/gateway.php/${subDomain}/v1/meta/users`);

  const encodedToken = btoa(`${userName}:${password}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${encodedToken}`,
    },
  });

  if (!response.ok) {
    throw new BamboohrError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const objectData = resData as Record<string, unknown>;
  const dataArray = Object.values(objectData);

  const users = bamboohrResponseSchema.parse(dataArray);

  const validUsers: BamboohrUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const userResult = bamboohrUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
  };
};
