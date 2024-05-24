export type OrganisationEvents = {
  'google/common.organisation.inserted': OrganisationInserted;
};

type OrganisationInserted = {
  data: {
    organisationId: string;
  };
};
