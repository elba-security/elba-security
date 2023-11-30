import { http, type RequestHandler } from 'msw';
import { dataProtectionRoutes } from '@elba-security/api-client';

export const createDataProtectionRequestHandlers = (baseUrl: string): RequestHandler[] =>
  dataProtectionRoutes.map((route) => http[route.method](`${baseUrl}${route.path}`, route.handler));
