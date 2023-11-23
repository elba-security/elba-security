import { http, type RequestHandler } from 'msw';
import { updateUsersSchema, deleteUsersSchema, baseRequestSchema } from 'elba-schema';

export const createUsersRequestHandlers = (baseUrl: string): RequestHandler[] => [
  http.post(`${baseUrl}/users`, async ({ request }) => {
    const data = await request.json();
    const result = baseRequestSchema.and(updateUsersSchema).safeParse(data);

    if (!result.success) {
      return new Response(result.error.toString(), {
        status: 400,
      });
    }

    return Response.json({
      insertedOrUpdatedCount: result.data.users.length,
    });
  }),
  http.delete(`${baseUrl}/users`, async ({ request }) => {
    const data = await request.json();
    const result = baseRequestSchema.and(deleteUsersSchema).safeParse(data);

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
