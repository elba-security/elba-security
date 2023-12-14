import { env } from '@/env';
import { AsanaError } from './commons/error';

export type AsanaUser = {
  gid: string;
  email: string;
  name: string;
  resource_type: string;
  role: string;
  workspaces: [
    {
      gid: string;
      name: string;
      resource_type: string;
    },
  ];
};

export type GetUsersResponseData = {
  data?: AsanaUser[];
  next_page?: {
    offset: string;
    path: string;
    uri: string;
  };
};

export const getUsers = async (accessToken: string, workspace: string, offset?: string) => {
  /* eslint-disable -- no type here */
  try {
    console.log("offset", offset)
    const opt_fields = 'email, name';
    
    const response = await fetch(`https://app.asana.com/api/1.0/users?opt_fields=${opt_fields}&workspace=${workspace}&limit=${env.USERS_SYNC_JOB_BATCH_SIZE}${offset ? `&offset=${offset}` : ""}`
    , {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

    const data: GetUsersResponseData = await response.json();
    /* eslint-enable -- no type here */
    return {
      users: data.data ?? [],
      offset: data.next_page?.offset ?? null,
    };
  } catch (error: unknown) {
    throw new AsanaError(`Could retrieve users of workspace=${workspace}`, {
      cause: error,
    });
  }
};
