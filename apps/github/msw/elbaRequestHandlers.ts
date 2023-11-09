import { HttpResponse, RequestHandler, http } from 'msw';
import {
  RequestHandlerDefaultInfo,
  RequestHandlerOptions,
} from 'msw/lib/core/handlers/RequestHandler';
import { env } from '@/common/env';
import { z } from 'zod';

const updateUsersSchema = z.object({
  organisationId: z.string().uuid(),
  sourceId: z.string().uuid(),
  users: z.array(
    z.object({
      id: z.string(),
      email: z.string().optional(),
      displayName: z.string(),
      additionalEmails: z.array(z.string()),
    })
  ),
});

const deleteUsersSchema = z.object({
  organisationId: z.string().uuid(),
  sourceId: z.string().uuid(),
  ids: z.array(z.string()).optional(),
  lastSyncedBefore: z.string().datetime().optional(),
});

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

export const elbaRequestHandlers: RequestHandler<
  RequestHandlerDefaultInfo,
  any,
  any,
  RequestHandlerOptions
>[] = [
  http.post(`${env.ELBA_API_BASE_URL}/users`, async ({ request }) => {
    const data = await request.json();
    const result = updateUsersSchema.safeParse(data);

    if (!result.success) {
      return new HttpResponse(null, {
        status: 400,
      });
    }

    return HttpResponse.json({
      insertedOrUpdatedCount: result.data.users.length,
    });
  }),
  http.delete(`${env.ELBA_API_BASE_URL}/users`, async ({ request }) => {
    const data = await request.json();
    const result = deleteUsersSchema.safeParse(data);

    if (
      !result.success ||
      Boolean(result.data.lastSyncedBefore) === Boolean(result.data.ids?.length)
    ) {
      return new HttpResponse(null, {
        status: 400,
      });
    }

    return HttpResponse.json({
      success: true,
    });
  }),
  http.post(`${env.ELBA_API_BASE_URL}/third-party-apps/objects`, async ({ request }) => {
    const data = await request.json();
    const result = updateThirdPartyAppsSchema.safeParse(data);

    if (!result.success) {
      return new HttpResponse(null, {
        status: 400,
      });
    }

    const usersIds = result.data.apps.reduce((ids, app) => {
      for (const user of app.users) {
        ids.add(user.id);
      }
      return ids;
    }, new Set<string>());

    return HttpResponse.json({
      // TODO: add message property
      data: {
        processedApps: result.data.apps.length,
        processedUsers: usersIds.size,
      },
    });
  }),
  http.delete(`${env.ELBA_API_BASE_URL}/third-party-apps/objects`, async ({ request }) => {
    const data = await request.json();
    const result = deleteThirdPartyAppsSchema.safeParse(data);

    if (!result.success || Boolean(result.data.syncedBefore) === Boolean(result.data.ids?.length)) {
      return new HttpResponse(null, {
        status: 400,
      });
    }

    return HttpResponse.json({
      success: true,
    });
  }),
];
