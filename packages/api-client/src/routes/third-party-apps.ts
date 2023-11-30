import { deleteThirdPartyAppsSchema, updateThirdPartyAppsSchema } from '@elba-security/schemas';
import { createRoute } from '../utils';

const path = '/third-party-apps/objects';

export const updateThirdPartyAppsRoute = createRoute({
  path,
  method: 'post',
  schema: updateThirdPartyAppsSchema,
  handler: ({ data }) => {
    const usersIds = data.apps.reduce((ids, app) => {
      for (const user of app.users) {
        ids.add(user.id);
      }
      return ids;
    }, new Set<string>());

    return Response.json({
      data: {
        processedApps: data.apps.length,
        processedUsers: usersIds.size,
      },
    });
  },
});

export const deleteThirdPartyAppsRoute = createRoute({
  path,
  method: 'delete',
  schema: deleteThirdPartyAppsSchema,
});

export const thirdPartyAppsRoutes = [updateThirdPartyAppsRoute, deleteThirdPartyAppsRoute];
