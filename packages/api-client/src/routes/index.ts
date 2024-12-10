import { connectionStatusRoutes } from './connection-status';
import { dataProtectionRoutes } from './data-protection';
import { organisationsRoutes } from './organisations';
import { thirdPartyAppsRoutes } from './third-party-apps';
import { usersRoutes } from './users';

export * from './connection-status';
export * from './data-protection';
export * from './organisations';
export * from './third-party-apps';
export * from './users';

export const elbaApiRoutes = [
  ...connectionStatusRoutes,
  ...dataProtectionRoutes,
  ...organisationsRoutes,
  ...thirdPartyAppsRoutes,
  ...usersRoutes,
];
