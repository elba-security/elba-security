export type GetTokenResponseData = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export type HerokuTeam = {
  id: string;
  created_at: string;
  name: string;
  updated_at: string;
  permissions: string[];
  trial: boolean;
  identity_provider: {
    id: string;
    name: string;
    owner: {
      id: string;
      name: string;
      type: 'team' | 'enterprise-account';
    };
  } | null;
};

export type HerokuUser = {
  enterprise_account: {
    id: string;
    name: string;
  };
  id: string;
  permissions: {
    description: string;
    name: 'billing' | 'manage' | 'create' | 'view';
  }[];
  user: {
    email: string;
    id: string;
  };
  two_factor_authentication: boolean;
  identity_provider: {
    id: string;
    name: string;
    redacted: boolean;
    owner: {
      id: string;
      name: string;
      type: 'enterprise-account' | 'team';
    };
  };
};
