export type CodeExchangeData = {
  access_token: string;
  token_type: string;
  expires_in: number;
  data: { id: string; gid: string; name: string; email: string };
  refresh_token: string;
};
export type AsanaCredentialTableData = {
  id: string;
  gid: string;
  name: string;
  email: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
};

export type Job = {
  organisation_id: string;
  pagination_token?: string;
  sync_started_at: string;
  priority: number;
};

export type User = {
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

export type AsanaUsersData = {
  users: User[];
  next_page?: {
    offset: string;
    path: string;
    uri: string;
  };
};
export type RefreshTokenResponse = {
  access_token: string;
  expires_in: number;
};

export type ElbaSendData = {
  id: string;
  email: string;
  displayName: string;
  additionalEmails: string[];
};
type Filter = {
  resource_type: string;
  resource_subtype: string | null;
  action: string;
  fields: string[] | null;
};
export type WebhookData = {
  data: {
    gid: string;
    resource_type: string;
    resource: {
      gid: string;
      resource_type: string;
      name: string;
    };
    target: string;
    active: boolean;
    is_workspace_webhook: boolean;
    created_at: string;
    last_failure_at: string | null;
    last_failure_content: string;
    last_success_at: string;
    filters?: Filter[];
  };
};
