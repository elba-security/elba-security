import { updateAuthenticationObjectsSchema } from '@elba-security/schemas';
import { createRoute } from '../utils';

const path = '/authentication/objects';

export const updateAuthenticationObjectsRoute = createRoute({
  path,
  method: 'post',
  schema: updateAuthenticationObjectsSchema,
});

export const authenticationRoutes = [updateAuthenticationObjectsRoute];
