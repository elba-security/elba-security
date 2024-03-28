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

export type GetUsersResponseData = {
  users: HarvestUser[];
  next_page: number;
};
export type HarvestUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  access_roles: AccessRole[];
};

type AccessRole = 'member' | 'manager' | 'administrator';
