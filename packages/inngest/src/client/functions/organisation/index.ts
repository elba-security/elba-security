import { type ElbaRegion } from '@elba-security/schemas';

type OrganisationData = {
  organisationId: string;
  region: ElbaRegion;
};

type OrganisationInstalledEvent = {
  'organisation.installed': OrganisationData;
};

type OrganisationUninstalledEvent = {
  'organisation.uninstalled': OrganisationData;
};

export type OrganisationEvents = OrganisationInstalledEvent | OrganisationUninstalledEvent;
