import { RequestSender } from './request-sender';
import { ConnectionStatusClient } from './resources/connection-status/client';
import { ConnectionsClient } from './resources/connections/client';
import { DataProtectionClient } from './resources/data-protection/client';
import { OrganisationsClient } from './resources/organisations/client';
import { ThirdPartyAppsClient } from './resources/third-party-apps/client';
import { UsersClient } from './resources/users/client';
import type { ElbaOptions } from './types';

export class Elba {
  readonly connections: ConnectionsClient;
  readonly connectionStatus: ConnectionStatusClient;
  readonly dataProtection: DataProtectionClient;
  readonly organisations: OrganisationsClient;
  readonly thirdPartyApps: ThirdPartyAppsClient;
  readonly users: UsersClient;

  constructor(options: ElbaOptions) {
    const requestSender = new RequestSender({
      ...options,
      baseUrl: options.baseUrl.replace('{REGION}', options.region),
    });
    this.connections = new ConnectionsClient(requestSender);
    this.connectionStatus = new ConnectionStatusClient(requestSender);
    this.dataProtection = new DataProtectionClient(requestSender);
    this.organisations = new OrganisationsClient(requestSender);
    this.thirdPartyApps = new ThirdPartyAppsClient(requestSender);
    this.users = new UsersClient(requestSender);
  }
}
