export type OrganisationEvents = {
  'gmail/common.organisation.inserted': OrganisationInserted;
};

type OrganisationInserted = {
  data: {
    organisationId: string;
  };
};
