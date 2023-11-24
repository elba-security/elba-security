import { http, type RequestHandler } from 'msw';
import { connectionStatusRoutes } from 'elba-api';

export const createConnectionStatusRequestHandlers = (baseUrl: string): RequestHandler[] =>
  connectionStatusRoutes.map((route) =>
    http[route.method](`${baseUrl}${route.path}`, route.handler)
  );
