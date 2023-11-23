import { http, type RequestHandler } from 'msw';
import {
  updateThirdPartyAppsSchema,
  deleteThirdPartyAppsSchema,
  baseRequestSchema,
} from 'elba-schema';

export const createThirdPartyAppsRequestHandlers = (baseUrl: string): RequestHandler[] => [
  http.post(`${baseUrl}/third-party-apps/objects`, async ({ request }) => {
    const data = await request.json();
    const result = baseRequestSchema.and(updateThirdPartyAppsSchema).safeParse(data);

    if (!result.success) {
      return new Response(result.error.toString(), {
        status: 400,
      });
    }

    const usersIds = result.data.apps.reduce((ids, app) => {
      for (const user of app.users) {
        ids.add(user.id);
      }
      return ids;
    }, new Set<string>());

    return Response.json({
      data: {
        processedApps: result.data.apps.length,
        processedUsers: usersIds.size,
      },
    });
  }),
  http.delete(`${baseUrl}/third-party-apps/objects`, async ({ request }) => {
    const data = await request.json();
    const result = baseRequestSchema.and(deleteThirdPartyAppsSchema).safeParse(data);

    if (!result.success) {
      return new Response(result.error.toString(), {
        status: 400,
      });
    }

    return Response.json({
      success: true,
    });
  }),
];
