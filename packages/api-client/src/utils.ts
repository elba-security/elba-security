import { baseRequestSchema } from '@elba-security/schemas';
import type { ZodSchema, infer as zInfer } from 'zod';

type Method = 'post' | 'delete';

type Route = {
  path: string;
  method: Method;
  handler: ({ request }: { request: Request }) => Promise<Response>;
};

export type RequestHandler<T extends ZodSchema> = ({
  request,
  data,
}: {
  request: Request;
  data: zInfer<T>;
}) => Response | Promise<Response>;

const defaultRequestHandler = (): Response => {
  return Response.json({ success: true });
};

const requestHandler = async <T extends ZodSchema>({
  request,
  handler,
  schema,
}: {
  request: Request;
  handler?: RequestHandler<T>;
  schema: T;
}): Promise<Response> => {
  const data: unknown = await request.json();
  const result = baseRequestSchema.and(schema).safeParse(data);

  if (!result.success) {
    return new Response(result.error.toString(), {
      status: 400,
    });
  }

  if (handler) {
    return handler({ request, data });
  }

  return defaultRequestHandler();
};

export const createRoute = <T extends ZodSchema>({
  path,
  method,
  handler,
  schema,
}: {
  path: string;
  method: Method;
  handler?: ({ request }: { request: Request; data: zInfer<T> }) => Response | Promise<Response>;
  schema: T;
}): Route => {
  return {
    path,
    method,
    handler: ({ request }: { request: Request }) => requestHandler({ request, handler, schema }),
  };
};
