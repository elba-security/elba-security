import { decrypt } from '@/common/crypto';
import { CloudflareError } from './commons/error';

export type CloudflareUser = {
  id: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  email: string;
};

const accountEndpoint = 'https://api.cloudflare.com/client/v4/accounts';
type GetAccountIdResponse = {
  nextPage: number | null;
  users: CloudflareUser[];
};

export const getAccountId = async (email: string, authKey: string): Promise<string> => {
  const account = await fetch(accountEndpoint, {
    headers: { 'X-Auth-Email': email, 'X-Auth-Key': authKey },
  });

  if (!account.ok) {
    throw new CloudflareError('Could not retrieve users', { response: account });
  }

  const accountResponse = (await account.json()) as { result: { id: string }[] };
  const accountId = accountResponse.result[0]?.id;

  if (!accountId) {
    throw new Error('Account ID not found');
  }

  return accountId;
};

export const getUsers = async (
  authKey: string,
  email: string,
  page: number | null
): Promise<GetAccountIdResponse> => {
  const accountId = await getAccountId(email, authKey);
  const result = await fetch(
    `${accountEndpoint}/${accountId}/members?per_page=1&page=${page?.toString() ?? '1'}`,
    {
      headers: { 'X-Auth-Email': email, 'X-Auth-Key': authKey },
    }
  );

  if (!result.ok) {
    throw new CloudflareError('Could not retrieve users', { response: result });
  }

  const response = (await result.json()) as {
    result: CloudflareUser[];
    result_info: { total_pages: number };
  };
  const totalPages = response.result_info.total_pages;
  const nextPage = page && page < totalPages ? page + 1 : null;

  return {
    nextPage,
    users: response.result,
  };
};

export const deleteUser = async (email: string, authKey: string, userId: string): Promise<void> => {
  const dcrAuthKey = await decrypt(authKey);
  const accountId = await getAccountId(email, dcrAuthKey);
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/members/${userId}`,
    {
      method: 'DELETE',
      headers: { 'X-Auth-Email': email, 'X-Auth-Key': dcrAuthKey },
    }
  );

  if (!response.ok) {
    throw new CloudflareError(`Could not delete user with Id: ${userId}`, { response });
  }
};
