import { z } from 'zod';
import { MySaasError } from './commons/error';


export type ZendeskUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const ZendeskUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role:z.string(),
});

const GetUsersResponseDataSchema = z.object({
  users: z.array(ZendeskUserSchema),
  next_page: z.string().nullable(),
  previous_page: z.string().nullable(),
  count: z.number()
});

type GetUsersResponse = {
  users: ZendeskUser[];
  next_page: string | null;
  previous_page: string | null;
  count: number;
};


export const getUsers = async ({token, pageUrl} ) => {
  const response = await fetch(`${pageUrl}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!response.ok) {
    throw new MySaasError('Could not retrieve users', { response });
  }
  
  const users = await response.json() as GetUsersResponse;

  try {
    const validatedData = GetUsersResponseDataSchema.parse(users);
    return validatedData;
  } catch (error) {
    throw new MySaasError('Invalid response data received', { response });
  }
};


