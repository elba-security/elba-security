import { env } from '@/common/env';
import { RequestSender } from './RequestSender';
import { ThirdPartyApps } from './resources/third-party-apps/ThirdPartyApps';
import { Users } from './resources/users/Users';

export class ElbaRepository {
  readonly users: Users;
  readonly thridPartyApps: ThirdPartyApps;

  constructor(organisationId: string) {
    const requestSender = new RequestSender({
      organisationId,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    this.users = new Users(requestSender);
    this.thridPartyApps = new ThirdPartyApps(requestSender);
  }
}
