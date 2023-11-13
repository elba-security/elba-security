import { http, type RequestHandler } from 'msw';
import { z } from 'zod';

const updateConnectionStatusSchema = z.object({
  organisationId: z.string().uuid(),
  sourceId: z.string().uuid(),
  hasError: z.boolean(),
});

export const createConnectionStatusRequestHandlers = (baseUrl: string): RequestHandler[] => [
  http.post(`${baseUrl}/connection-status`, async ({ request }) => {
    const data = await request.json();
    const result = updateConnectionStatusSchema.safeParse(data);

    if (!result.success) {
      return new Response(null, {
        status: 400,
      });
    }

    return Response.json({
      success: true,
    });
  }),
];
