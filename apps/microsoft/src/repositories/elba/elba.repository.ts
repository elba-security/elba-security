import { env } from '@/common/env';
import { RequestSender } from './request-sender';
import { ThirdPartyApps } from './resources/third-party-apps/third-party-apps';
import { Users } from './resources/users/users';

export class ElbaRepository {
  readonly users: Users;
  readonly thirdPartyApps: ThirdPartyApps;

  constructor(organisationId: string) {
    const requestSender = new RequestSender({
      organisationId,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    this.users = new Users(requestSender);
    this.thirdPartyApps = new ThirdPartyApps(requestSender);
  }
}
