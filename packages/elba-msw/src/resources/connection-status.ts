import { http, type RequestHandler } from 'msw';
import { updateConnectionStatusSchema, baseRequestSchema } from 'elba-schema';

export const createConnectionStatusRequestHandlers = (baseUrl: string): RequestHandler[] => [
  http.post(`${baseUrl}/connection-status`, async ({ request }) => {
    const data = await request.json();
    const result = baseRequestSchema.and(updateConnectionStatusSchema).safeParse(data);

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
