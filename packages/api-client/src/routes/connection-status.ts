import { updateConnectionStatusDataSchema } from '@elba-security/schemas';
import { createRoute } from '../utils';

const path = '/connection-status';

export const updateConnectionStatusRoute = createRoute({
  path,
  method: 'post',
  schema: updateConnectionStatusDataSchema,
});

export const connectionStatusRoutes = [updateConnectionStatusRoute];
