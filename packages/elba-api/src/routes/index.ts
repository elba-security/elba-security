import { authenticationRoutes } from './authentication';
import { connectionStatusRoutes } from './connection-status';
import { dataProtectionRoutes } from './data-protection';
import { thirdPartyAppsRoutes } from './third-party-apps';
import { usersRoutes } from './users';

export * from './authentication';
export * from './connection-status';
export * from './data-protection';
export * from './third-party-apps';
export * from './users';

export const elbaApiRoutes = [
  ...authenticationRoutes,
  ...connectionStatusRoutes,
  ...dataProtectionRoutes,
  ...thirdPartyAppsRoutes,
  ...usersRoutes,
];
