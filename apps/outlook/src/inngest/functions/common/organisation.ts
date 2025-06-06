export type OrganisationEvents = {
  'outlook/common.organisation.inserted': OrganisationInserted;
};

type OrganisationInserted = {
  data: {
    organisationId: string;
  };
};
