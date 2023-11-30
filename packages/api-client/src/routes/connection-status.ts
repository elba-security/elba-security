import { updateConnectionStatusSchema } from '@elba-security/schemas';
import { createRoute } from '../utils';

const path = '/connection-status';

export const updateConnectionStatusRoute = createRoute({
  path,
  method: 'post',
  schema: updateConnectionStatusSchema,
});

export const connectionStatusRoutes = [updateConnectionStatusRoute];
