import { type RequestHandler } from 'msw';
import { createAuthRequestHandler } from './auth-request-handler';
import { createAuthenticationRequestHandlers } from './resources/authentication';
import { createConnectionStatusRequestHandlers } from './resources/connection-status';
import { createDataProtectionRequestHandlers } from './resources/data-protection';
import { createThirdPartyAppsRequestHandlers } from './resources/third-party-apps';
import { createUsersRequestHandlers } from './resources/users';

export const createElbaRequestHandlers = (baseUrl: string, apiKey: string): RequestHandler[] => [
  createAuthRequestHandler(baseUrl, apiKey),
  ...createAuthenticationRequestHandlers(baseUrl),
  ...createConnectionStatusRequestHandlers(baseUrl),
  ...createDataProtectionRequestHandlers(baseUrl),
  ...createThirdPartyAppsRequestHandlers(baseUrl),
  ...createUsersRequestHandlers(baseUrl),
];
