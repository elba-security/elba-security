import { http, type RequestHandler } from 'msw';
import { configurationsRoutes } from '@elba-security/api-client';

export const createConfigurationsRequestHandlers = (baseUrl: string): RequestHandler[] =>
  configurationsRoutes.map((route) => http[route.method](`${baseUrl}${route.path}`, route.handler));
