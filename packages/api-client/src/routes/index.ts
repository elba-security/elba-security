import { connectionStatusRoutes } from './connection-status';
import { dataProtectionRoutes } from './data-protection';
import { thirdPartyAppsRoutes } from './third-party-apps';
import { usersRoutes } from './users';

export * from './connection-status';
export * from './data-protection';
export * from './third-party-apps';
export * from './users';

export const elbaApiRoutes = [
  ...connectionStatusRoutes,
  ...dataProtectionRoutes,
  ...thirdPartyAppsRoutes,
  ...usersRoutes,
];
