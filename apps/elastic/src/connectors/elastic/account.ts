import { ElasticError } from './common/error';

type AccountInfo = {
  id: number;
};

type GetAccountIdResponseData = { organizations: AccountInfo[] };

export type GetAccountsParams = {
  apiKey: string;
};

export const getAccountId = async ({ apiKey }: GetAccountsParams) => {
  const response = await fetch('https://api.elastic-cloud.com/api/v1/organizations', {
    method: 'GET',
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ElasticError('API request failed', { response });
  }

  const { organizations: accounts } = (await response.json()) as GetAccountIdResponseData;

  if (!accounts[0]) {
    throw new ElasticError('Could not retrieve account id');
  }
  const { id: accountId } = accounts[0];

  return {
    accountId: String(accountId),
  };
};
