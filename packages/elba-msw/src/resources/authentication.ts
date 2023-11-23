import { http, type RequestHandler } from 'msw';
import { updateAuthenticationObjectsSchema, baseRequestSchema } from 'elba-schema';

export const createAuthenticationRequestHandlers = (baseUrl: string): RequestHandler[] => [
  http.post(`${baseUrl}/authentication/objects`, async ({ request }) => {
    const data = await request.json();
    const result = baseRequestSchema.and(updateAuthenticationObjectsSchema).safeParse(data);

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
