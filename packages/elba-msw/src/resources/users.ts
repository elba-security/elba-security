import { http, type RequestHandler } from 'msw';
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

export const createUsersRequestHandlers = (baseUrl: string): RequestHandler[] => [
  http.post(`${baseUrl}/users`, async ({ request }) => {
    const data = await request.json();
    const result = updateUsersSchema.safeParse(data);

    if (!result.success) {
      return new Response(null, {
        status: 400,
      });
    }

    return Response.json({
      insertedOrUpdatedCount: result.data.users.length,
    });
  }),
  http.delete(`${baseUrl}/users`, async ({ request }) => {
    const data = await request.json();
    const result = deleteUsersSchema.safeParse(data);

    if (
      !result.success ||
      Boolean(result.data.lastSyncedBefore) === Boolean(result.data.ids?.length)
    ) {
      return new Response(null, {
        status: 400,
      });
    }

    return Response.json({
      success: true,
    });
  }),
];
