import {
  type DeleteDataProtectionObjects,
  type DeleteThirdPartyApps,
  type DeleteUsers,
  type UpdateConnectionStatusData,
  type UpdateDataProtectionObjects,
  type UpdateThirdPartyApps,
  type UpdateUsers,
} from '@elba-security/schemas';
import { type InstallationEvents, type OrganisationEvents, type UsersEvents } from './functions';

export type IntegrationEvents = InstallationEvents | OrganisationEvents | UsersEvents;

export type ElbaOrganisationEvents = {
  'connection_status.updated': UpdateConnectionStatusData;
  'data_protection.objects.updated': UpdateDataProtectionObjects;
  'data_protection.objects.deleted': DeleteDataProtectionObjects;
  'third_party_apps.objects.updated': UpdateThirdPartyApps;
  'third_party_apps.objects.deleted': DeleteThirdPartyApps;
  'users.updated': UpdateUsers;
  'users.deleted': DeleteUsers;
};
