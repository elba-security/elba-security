export type InngestEvents = {
  'cloudflare/users.page_sync.requested': {
    data: {
      organisationId: string;
      region: string;
      isFirstSync: boolean;
      syncStartedAt: number;
      page: number;
    };
  };
  'cloudflare/users.delete.requested': {
    data: {
      id: string;
      organisationId: string;
      region: string;
    };
  };
};
