import { http, type RequestHandler } from 'msw';
import { z } from 'zod';

const updateAuthenticationObjectsSchema = z.object({
  organisationId: z.string().uuid(),
  sourceId: z.string().uuid(),
  objects: z.array(
    z.object({
      userId: z.string(),
      authMethod: z.enum(['mfa', 'password', 'sso']),
    })
  ),
});

export const createAuthenticationRequestHandlers = (baseUrl: string): RequestHandler[] => [
  http.post(`${baseUrl}/authentication/objects`, async ({ request }) => {
    const data = await request.json();
    const result = updateAuthenticationObjectsSchema.safeParse(data);

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
