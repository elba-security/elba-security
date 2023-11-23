import { http, type RequestHandler } from 'msw';
import {
  updateDataProtectionObjectsSchema,
  deleteDataProtectionObjectsSchema,
  baseRequestSchema,
} from 'elba-schema';

export const createDataProtectionRequestHandlers = (baseUrl: string): RequestHandler[] => [
  http.post(`${baseUrl}/data-protection/objects`, async ({ request }) => {
    const data = await request.json();
    const result = baseRequestSchema.and(updateDataProtectionObjectsSchema).safeParse(data);

    if (!result.success) {
      return new Response(result.error.toString(), {
        status: 400,
      });
    }

    return Response.json({
      success: true,
    });
  }),
  http.delete(`${baseUrl}/data-protection/objects`, async ({ request }) => {
    const data = await request.json();
    const result = baseRequestSchema.and(deleteDataProtectionObjectsSchema).safeParse(data);

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
