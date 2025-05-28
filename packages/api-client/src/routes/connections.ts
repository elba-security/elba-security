import {
  deleteConnectionsObjectsSchema,
  updateConnectionsObjectsSchema,
} from '@elba-security/schemas';
import { createRoute } from '../utils';

const path = '/connections/objects';

export const updateConnectionsObjectsRoute = createRoute({
  path,
  method: 'post',
  schema: updateConnectionsObjectsSchema,
});

export const deleteConnectionsObjectsRoute = createRoute({
  path,
  method: 'delete',
  schema: deleteConnectionsObjectsSchema,
});

export const connectionsRoutes = [updateConnectionsObjectsRoute, deleteConnectionsObjectsRoute];
