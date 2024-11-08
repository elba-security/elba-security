import { NonRetriableError } from 'inngest';
import { DocusignError } from '../common/error';

type AccountInfo = {
  is_default: boolean;
  base_uri: string;
  account_id: string;
};

export const getRequestInfo = async (
  accessToken: string,
  rootUrl: string
): Promise<{ baseUri: string; accountId: string; ownerId: string }> => {
  const response = await fetch(`${rootUrl}/oauth/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = (await response.json()) as { sub: string; accounts: AccountInfo[] };

  if (data.accounts.length <= 0) {
    throw new NonRetriableError('Failed to get request info');
  }

  const defaultAccount = data.accounts.find((account: AccountInfo) => account.is_default);

  if (!defaultAccount) {
    throw new DocusignError('failed to get DocuSign default account');
  }

  return {
    ownerId: data.sub,
    baseUri: defaultAccount.base_uri,
    accountId: defaultAccount.account_id,
  };
};
