import {
  deleteDataProtectionObjectsSchema,
  updateDataProtectionObjectsSchema,
} from '@elba-security/schemas';
import { createRoute } from '../utils';

const path = '/data-protection/objects';

export const updateDataProtectionObjectsRoute = createRoute({
  path,
  method: 'post',
  schema: updateDataProtectionObjectsSchema,
});

export const deleteDataProtectionObjectsRoute = createRoute({
  path,
  method: 'delete',
  schema: deleteDataProtectionObjectsSchema,
});

export const dataProtectionRoutes = [
  updateDataProtectionObjectsRoute,
  deleteDataProtectionObjectsRoute,
];
