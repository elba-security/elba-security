export type GetTokenResponseData = { access_token: string; token_type: string; scope: string };

export type WebflowSite = {
  id: string;
  displayName: string;
};

export type GetSiteResponseData = {
  sites: WebflowSite[];
};

export type WebflowUser = {
  id: string;
  data: {
    email: string;
    name: string;
  };
};

export type GetUsersResponseData = {
  users: WebflowUser[];
  count: number;
  limit: number;
  offset: number;
  total: number;
};
