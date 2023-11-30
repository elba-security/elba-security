import { http, type RequestHandler } from 'msw';
import { thirdPartyAppsRoutes } from '@elba-security/api-client';

export const createThirdPartyAppsRequestHandlers = (baseUrl: string): RequestHandler[] =>
  thirdPartyAppsRoutes.map((route) => http[route.method](`${baseUrl}${route.path}`, route.handler));
