export type GetTokenResponseData = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export type GetAccountResponseData = {
  accounts: HarvestAccount[];
};

export type HarvestAccount = {
  id: number;
  name: string;
  product: string;
};

export type HarvestUser = null;
