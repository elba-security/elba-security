import { z } from 'zod';
import { env } from '@/common/env/server';
import { DocusignError, DocusignNotAdminError } from '../common/error';
import { getUser } from './users';

const accountInfo = z.object({
  account_id: z.string(),
  is_default: z.boolean(),
  account_name: z.string(),
  base_uri: z.string(),
});

const getAuthUserResponseData = z.object({
  sub: z.string(),
  accounts: z.array(accountInfo),
});

export const getAuthUser = async (accessToken: string) => {
  // DOC: https://developers.docusign.com/platform/auth/reference/user-info/
  const response = await fetch(`${env.DOCUSIGN_APP_INSTALL_URL}/oauth/userinfo`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new DocusignError('Failed to retrieve authenticated user information', { response });
  }

  const data: unknown = await response.json();
  const result = getAuthUserResponseData.safeParse(data);

  if (!result.success || !result.data.accounts.length) {
    throw new DocusignError('Could not retrieve account id', { response });
  }

  const baseAccount = result.data.accounts.find((account) => account.is_default);

  if (!baseAccount) {
    throw new DocusignError('Could not retrieve account id or base URI', { response });
  }

  // We need to identify if the auth user is an admin or not
  const { isAdmin } = await getUser({
    apiBaseUri: baseAccount.base_uri,
    accessToken,
    accountId: baseAccount.account_id,
    userId: result.data.sub,
  });

  if (isAdmin !== 'True') {
    throw new DocusignNotAdminError('User is not an admin');
  }

  return {
    authUserId: result.data.sub,
    accountId: baseAccount.account_id,
    apiBaseUri: baseAccount.base_uri,
  };
};
