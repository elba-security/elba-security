import { http, type RequestHandler } from 'msw';
import { organisationsRoutes } from '@elba-security/api-client';

export const createOrganisationsRequestHandlers = (baseUrl: string): RequestHandler[] =>
  organisationsRoutes.map((route) => http[route.method](`${baseUrl}${route.path}`, route.handler));
