import { type RequestHandler } from 'msw';
import { createAuthRequestHandler } from './auth-request-handler';
import { createConnectionStatusRequestHandlers } from './resources/connection-status';
import { createDataProtectionRequestHandlers } from './resources/data-protection';
import { createOrganisationsRequestHandlers } from './resources/organisations';
import { createThirdPartyAppsRequestHandlers } from './resources/third-party-apps';
import { createUsersRequestHandlers } from './resources/users';

export const createElbaRequestHandlers = (baseUrl: string, apiKey: string): RequestHandler[] => [
  createAuthRequestHandler(baseUrl, apiKey),
  ...createConnectionStatusRequestHandlers(baseUrl),
  ...createDataProtectionRequestHandlers(baseUrl),
  ...createThirdPartyAppsRequestHandlers(baseUrl),
  ...createOrganisationsRequestHandlers(baseUrl),
  ...createUsersRequestHandlers(baseUrl),
];
