import { http, type RequestHandler } from 'msw';
import { authenticationRoutes } from '@elba-security/api-client';

export const createAuthenticationRequestHandlers = (baseUrl: string): RequestHandler[] =>
  authenticationRoutes.map((route) => http[route.method](`${baseUrl}${route.path}`, route.handler));
