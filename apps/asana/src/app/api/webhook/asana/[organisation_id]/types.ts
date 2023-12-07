type Filter = {
  resource_type: string;
  resource_subtype: string | null;
  action: string;
  fields: string[] | null;
};

export type WebhookEvent = {
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
