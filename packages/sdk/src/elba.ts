import { ElbaError } from './error';
import { RequestSender } from './request-sender';
import { AuthenticationClient } from './resources/authentication/client';
import { ConnectionStatusClient } from './resources/connection-status/client';
import { DataProtectionClient } from './resources/data-protection/client';
import { ThirdPartyAppsClient } from './resources/third-party-apps/client';
import { UsersClient } from './resources/users/client';
import type { ElbaOptions } from './types';

export class Elba {
  readonly authentication: AuthenticationClient;
  readonly connectionStatus: ConnectionStatusClient;
  readonly dataProtection: DataProtectionClient;
  readonly thirdPartyApps: ThirdPartyAppsClient;
  readonly users: UsersClient;

  constructor(options: ElbaOptions) {
    const baseUrl = options.baseUrl ?? process.env.ELBA_API_BASE_URL;
    if (!baseUrl) {
      throw new ElbaError(
        'Missing baseUrl: it should be either provided with Elba options or configured as process.env.ELBA_API_BASE_URL'
      );
    }
    const requestSender = new RequestSender({
      ...options,
      baseUrl,
    });
    this.authentication = new AuthenticationClient(requestSender);
    this.connectionStatus = new ConnectionStatusClient(requestSender);
    this.dataProtection = new DataProtectionClient(requestSender);
    this.users = new UsersClient(requestSender);
    this.thirdPartyApps = new ThirdPartyAppsClient(requestSender);
  }
}
