import { deleteUsersSchema, updateUsersSchema } from '@elba-security/schemas';
import { createRoute } from '../utils';

const path = '/users';

export const updateUsersRoute = createRoute({
  path,
  method: 'post',
  schema: updateUsersSchema,
});

export const deleteUsersRoute = createRoute({
  path,
  method: 'delete',
  schema: deleteUsersSchema,
});

export const usersRoutes = [updateUsersRoute, deleteUsersRoute];
