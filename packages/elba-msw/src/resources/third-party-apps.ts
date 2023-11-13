import { http, type RequestHandler } from 'msw';
import { z } from 'zod';

const updateThirdPartyAppsSchema = z.object({
  organisationId: z.string().uuid(),
  sourceId: z.string().uuid(),
  apps: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      logoUrl: z.string().optional(),
      url: z.string().optional(),
      publisherName: z.string().optional(),
      users: z.array(
        z.object({
          id: z.string(),
          createdAt: z.string().optional(),
          lastAccessedAt: z.string().optional(),
          scopes: z.array(z.string()),
          metadata: z.any().optional(),
        })
      ),
    })
  ),
});

const deleteThirdPartyAppsSchema = z.object({
  organisationId: z.string().uuid(),
  sourceId: z.string().uuid(),
  ids: z.array(z.string()).optional(),
  syncedBefore: z.string().datetime().optional(),
});

export const createThirdPartyAppsRequestHandlers = (baseUrl: string): RequestHandler[] => [
  http.post(`${baseUrl}/third-party-apps/objects`, async ({ request }) => {
    const data = await request.json();
    const result = updateThirdPartyAppsSchema.safeParse(data);

    if (!result.success) {
      return new Response(null, {
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
    const result = deleteThirdPartyAppsSchema.safeParse(data);

    if (!result.success || Boolean(result.data.syncedBefore) === Boolean(result.data.ids?.length)) {
      return new Response(null, {
        status: 400,
      });
    }

    return Response.json({
      success: true,
    });
  }),
];
