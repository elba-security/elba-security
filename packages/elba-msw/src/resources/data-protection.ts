import { http, type RequestHandler } from 'msw';
import { z } from 'zod';

const updateDataProtectionObjectsSchema = z.object({
  organisationId: z.string().uuid(),
  sourceId: z.string().uuid(),
  objects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      last_accessed_at: z.string().datetime().optional(),
      url: z.string().url(),
      owner_id: z.string(),
      metadata: z.any().optional(),
      content_hash: z.string().optional(),
      is_sensitive: z.boolean().optional(),
      permissions: z.array(
        z.object({
          id: z.string(),
          metadata: z.any().optional(),
          type: z.enum(['user', 'domain', 'anyone']),
          email: z.string().optional(),
          user_id: z.string().optional(),
          domain: z.string().optional(),
          display_name: z.string().optional(),
        })
      ),
    })
  ),
});

const deleteDataProtectionObjectsSchema = z.object({
  organisationId: z.string().uuid(),
  sourceId: z.string().uuid(),
  ids: z.array(z.string()).optional(),
  syncedBefore: z.string().datetime().optional(),
});

export const createDataProtectionRequestHandlers = (baseUrl: string): RequestHandler[] => [
  http.post(`${baseUrl}/data-protection/objects`, async ({ request }) => {
    const data = await request.json();
    const result = updateDataProtectionObjectsSchema.safeParse(data);

    if (!result.success) {
      return new Response(null, {
        status: 400,
      });
    }

    return Response.json({
      success: true,
    });
  }),
  http.delete(`${baseUrl}/data-protection/objects`, async ({ request }) => {
    const data = await request.json();
    const result = deleteDataProtectionObjectsSchema.safeParse(data);

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
