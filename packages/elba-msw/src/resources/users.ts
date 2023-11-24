import { http, type RequestHandler } from 'msw';
import { usersRoutes } from 'elba-api';

export const createUsersRequestHandlers = (baseUrl: string): RequestHandler[] =>
  usersRoutes.map((route) => http[route.method](`${baseUrl}${route.path}`, route.handler));
