import { updateAuthenticationObjectsSchema } from 'elba-schema';
import { createRoute } from '../utils';

const path = '/authentication/objects';

export const updateAuthenticationObjectsRoute = createRoute({
  path,
  method: 'post',
  schema: updateAuthenticationObjectsSchema,
});

export const authenticationRoutes = [updateAuthenticationObjectsRoute];
