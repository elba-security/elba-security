export type InngestEvents = {
  'datadog/users.page_sync.requested': {
    data: {
      organisationId: string;
      region: string;
      isFirstSync: boolean;
      syncStartedAt: number;
    };
  };
};
