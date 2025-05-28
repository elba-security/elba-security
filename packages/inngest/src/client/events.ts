import {
  type DeleteUsers,
  type UpdateConnectionStatusData,
  type UpdateUsers,
  type UpdateConnectionsObjects,
  type DeleteConnectionsObjects,
} from '@elba-security/schemas';
import { type InstallationEvents, type OrganisationEvents, type UsersEvents } from './functions';

export type IntegrationEvents = InstallationEvents | OrganisationEvents | UsersEvents;

export type ElbaOrganisationEvents = {
  'connection_status.updated': UpdateConnectionStatusData;
  'connections.deleted': DeleteConnectionsObjects;
  'connections.updated': UpdateConnectionsObjects;
  'users.deleted': DeleteUsers;
  'users.updated': UpdateUsers;
};
