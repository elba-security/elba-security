import {
  postConfigurationObjectsRequestBodySchema,
  deleteConfigurationObjectsRequestBodySchema,
} from '@elba-security/schemas';
import { createRoute } from '../utils';

const path = '/configurations/objects';

export const updateConfigurationsRoute = createRoute({
  path,
  method: 'post',
  schema: postConfigurationObjectsRequestBodySchema,
  handler: () => ({
    json: {
      success: true,
      data: {
        received: 2,
        created: 2,
        updated: 0,
        deleted: 0,
      },
    },
  }),
});

export const deleteConfigurationsRoute = createRoute({
  path,
  method: 'delete',
  schema: deleteConfigurationObjectsRequestBodySchema,
});

export const configurationsRoutes = [updateConfigurationsRoute, deleteConfigurationsRoute];
