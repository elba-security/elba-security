export type Organisation = {
  id: string;
  nangoConnectionId: string | null;
};

export type OrganisationsGetResult = {
  organisations: Organisation[];
};
