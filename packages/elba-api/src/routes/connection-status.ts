import { updateConnectionStatusSchema } from 'elba-schema';
import { createRoute } from '../utils';

const path = '/connection-status';

export const updateConnectionStatusRoute = createRoute({
  path,
  method: 'post',
  schema: updateConnectionStatusSchema,
});

export const connectionStatusRoutes = [updateConnectionStatusRoute];
