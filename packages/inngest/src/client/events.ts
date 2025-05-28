import {
  type SourceConnectionEmailScanningApp,
  type DeleteUsers,
  type UpdateConnectionStatusData,
  type UpdateUsers,
} from '@elba-security/schemas';
import { type InstallationEvents, type OrganisationEvents, type UsersEvents } from './functions';

export type IntegrationEvents = InstallationEvents | OrganisationEvents | UsersEvents;

export type ElbaOrganisationEvents = {
  'connection_status.updated': UpdateConnectionStatusData;
  'users.updated': UpdateUsers;
  'users.deleted': DeleteUsers;
  'connections.updated': {
    sourceId: string;
    organisationId: string;
    detectionMethod: 'email_scanning';
    apps: SourceConnectionEmailScanningApp[];
  };
  'connections.deleted': {
    sourceId: string;
    detectionMethod: 'email_scanning';
    organisationId: string;
    syncedBefore: string;
  };
};
