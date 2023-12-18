import * as Asana from 'asana';
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

type GetUsersResponseData = {
  users?: AsanaUser[];
  next_page?: {
    offset: string;
    path: string;
    uri: string;
  };
};

export const getUsers = async (accessToken: string, workspace: string, offset?: string) => {
  /* eslint-disable -- no type here */
  try {
    // @ts-expect-error -- no type here
    Asana.ApiClient.instance.authentications.token = accessToken;
    // @ts-expect-error -- no type here
    const usersApi = new Asana.UsersApi();
    const data: GetUsersResponseData = await usersApi.getUsers({
      workspace,
      limit: env.USERS_SYNC_JOB_BATCH_SIZE,
      offset: offset,
      opt_fields:
        'email, name,resource_type, offset, path,uri,workspaces,workspaces.name,workspaces.resource_type, role',
    });
    /* eslint-enable -- no type here */

    return {
      users: data.users ?? [],
      offset: data.next_page?.offset ?? null,
    };
  } catch (error: unknown) {
    throw new AsanaError(`Could retrieve users of workspace=${workspace}`, {
      cause: error,
    });
  }
};
